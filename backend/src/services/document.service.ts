import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { randomUUID } from 'crypto';
import type { Styles } from '../schemas/document.schema.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

interface SessionData { buffer: Buffer; originalName: string; }

export interface DocumentStyleInfo {
  id: string;        // Word styleId e.g. "Heading1"
  name: string;      // Display name e.g. "heading 1"
  type: 'heading' | 'body' | 'other';
  outlineLvl?: number; // 0=H1, 1=H2, 2=H3 etc
  // Current values parsed from the style definition
  alignment: 'left' | 'center' | 'right' | 'justify';
  fontSize?: number;        // in pt
  bold?: boolean;
  spacingBefore?: number;   // in pt
  spacingAfter?: number;    // in pt
  lineSpacing?: number;     // multiplier e.g. 1.15
  indent?: number;          // in pt
  firstLineIndent?: number; // in pt
}

function ptToTwips(pt: number) { return Math.round(pt * 20); }

function alignToOoxml(a: string): string {
  const map: Record<string, string> = {
    left: 'left', center: 'center', right: 'right',
    justify: 'both', justified: 'both',
  };
  return map[a?.toLowerCase()] ?? 'left';
}

function normalizeAlignment(raw: string): 'left' | 'center' | 'right' | 'justify' {
  const map: Record<string, 'left' | 'center' | 'right' | 'justify'> = {
    left: 'left', center: 'center', right: 'right',
    both: 'justify', justified: 'justify', justify: 'justify',
  };
  return map[raw?.toLowerCase()] ?? 'left';
}

// Robust attribute reader — xmldom may store w:xxx as prefixed, namespaced, or local
function readAttr(el: Element, localName: string): string {
  // Try 1: prefixed name (most common in xmldom)
  let v = el.getAttribute(`w:${localName}`);
  if (v !== null) return v;
  // Try 2: namespace-aware
  v = el.getAttributeNS(W, localName);
  if (v !== null) return v;
  // Try 3: iterate all attrs and match by localName
  const attrs = el.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs.item(i);
    if (a && (a.localName === localName || a.name === `w:${localName}`)) return a.value;
  }
  return '';
}

function wAttr(el: Element | undefined, name: string): string {
  if (!el) return '';
  return readAttr(el, name);
}
function setWAttr(el: Element, name: string, val: string) { el.setAttribute(`w:${name}`, val); }

// Robust element finder — tries getElementsByTagNameNS then getElementsByTagName
function findEl(parent: Element, tag: string): Element | undefined {
  const byNS = parent.getElementsByTagNameNS(W, tag);
  if (byNS && byNS.length > 0) return byNS[0] as Element;
  const byTag = parent.getElementsByTagName(`w:${tag}`);
  if (byTag && byTag.length > 0) return byTag[0] as Element;
  return undefined;
}

function getOrCreate(parent: Element, tag: string): Element {
  let el = findEl(parent, tag);
  if (!el) {
    el = parent.ownerDocument!.createElementNS(W, `w:${tag}`) as Element;
    parent.insertBefore(el, parent.firstChild);
  }
  return el;
}

// ─── Parse ALL paragraph styles from styles.xml ────────────────────────────────
function parseAllStyles(xml: string): Map<string, Omit<DocumentStyleInfo, 'type'>> {
  const result = new Map<string, Omit<DocumentStyleInfo, 'type'>>();

  // Capture every <w:style ...>...</w:style> block
  const blockRx = /<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g;
  let m: RegExpExecArray | null;

  while ((m = blockRx.exec(xml)) !== null) {
    const attrs = m[1];
    const inner = m[2];

    if (!attrs.includes('paragraph')) continue;

    const idM = attrs.match(/w:styleId="([^"]+)"/);
    if (!idM) continue;
    const id = idM[1];

    // Name
    const nameM = inner.match(/<w:name\s[^/]*w:val="([^"]+)"/);
    const name = nameM?.[1] ?? id;

    // outlineLvl
    const lvlM = inner.match(/<w:outlineLvl\s[^/]*w:val="(\d+)"/);
    const outlineLvl = lvlM ? parseInt(lvlM[1], 10) : undefined;

    // Alignment — inside pPr block
    const pPrM = inner.match(/<w:pPr\b[^>]*>([\s\S]*?)<\/w:pPr>/);
    const pPrInner = pPrM?.[1] ?? inner;
    const jcM = pPrInner.match(/<w:jc\s[^/]*w:val="([^"]+)"/);
    const alignment = normalizeAlignment(jcM?.[1] ?? 'left');

    // Font size (in rPr or rPrChange)
    const szM = inner.match(/<w:sz\s[^/]*w:val="(\d+)"/);
    const fontSize = szM ? parseInt(szM[1], 10) / 2 : undefined;

    // Bold
    const boldMatch = /<w:b(?:\s[^/]*)?\/>|<w:b\s+w:val="true"/.test(inner);
    // Avoid false-positive on <w:bCs>
    const bold = /<w:b(?!Cs)(?:\s[^/]*)?\/>/.test(inner) || /<w:b\s+w:val="true"/.test(inner) ? true : undefined;

    // Spacing
    const spacingM = inner.match(/<w:spacing\b([^/]*?)\/>/);
    let spacingBefore: number | undefined;
    let spacingAfter: number | undefined;
    let lineSpacing: number | undefined;

    if (spacingM) {
      const spacingAttrs = spacingM[1];
      const beforeM = spacingAttrs.match(/w:before="(\d+)"/);
      const afterM = spacingAttrs.match(/w:after="(\d+)"/);
      const lineM = spacingAttrs.match(/w:line="(\d+)"/);

      if (beforeM) spacingBefore = parseInt(beforeM[1], 10) / 20;
      if (afterM) spacingAfter = parseInt(afterM[1], 10) / 20;
      if (lineM) lineSpacing = parseInt(lineM[1], 10) / 240;
    }

    // Also try multi-line <w:spacing ...>
    if (!spacingM) {
      const spacingML = inner.match(/<w:spacing\b([^>]*?)>/);
      if (spacingML) {
        const spacingAttrs = spacingML[1];
        const beforeM = spacingAttrs.match(/w:before="(\d+)"/);
        const afterM = spacingAttrs.match(/w:after="(\d+)"/);
        const lineM = spacingAttrs.match(/w:line="(\d+)"/);
        if (beforeM) spacingBefore = parseInt(beforeM[1], 10) / 20;
        if (afterM) spacingAfter = parseInt(afterM[1], 10) / 20;
        if (lineM) lineSpacing = parseInt(lineM[1], 10) / 240;
      }
    }

    // Indent
    const indM = inner.match(/<w:ind\b([^/]*?)\/>/);
    let indent: number | undefined;
    let firstLineIndent: number | undefined;
    if (indM) {
      const indAttrs = indM[1];
      const leftM = indAttrs.match(/w:left="(\d+)"/);
      const firstM = indAttrs.match(/w:firstLine="(\d+)"/);
      if (leftM) indent = parseInt(leftM[1], 10) / 20;
      if (firstM) firstLineIndent = parseInt(firstM[1], 10) / 20;
    }

    result.set(id, {
      id,
      name,
      outlineLvl,
      alignment,
      fontSize,
      bold: bold || undefined,
      spacingBefore,
      spacingAfter,
      lineSpacing,
      indent,
      firstLineIndent,
    });
  }

  return result;
}

// ─── Collect used styleIds from document.xml ──────────────────────────────────
function collectUsedStyleIds(docXml: string): Set<string> {
  const used = new Set<string>();
  const rx = /<w:pStyle\s[^/]*w:val="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(docXml)) !== null) {
    used.add(m[1]);
  }
  return used;
}

// ─── Determine type of a style ────────────────────────────────────────────────
function classifyStyleType(info: { id: string; name: string; outlineLvl?: number }): 'heading' | 'body' | 'other' {
  if (
    (info.outlineLvl !== undefined && info.outlineLvl >= 0 && info.outlineLvl <= 8) ||
    /heading/i.test(info.name) ||
    /heading/i.test(info.id)
  ) {
    return 'heading';
  }
  if (
    /^(normal|body|default|no spacing|bodytext|normalweb|plain text|text body|standard)$/i.test(info.name.trim()) ||
    /body|normal|text|standard|plain|default/i.test(info.name)
  ) {
    return 'body';
  }
  return 'other';
}

// ─── Parse document styles — main export ──────────────────────────────────────
export async function parseDocumentStyles(buffer: Buffer): Promise<DocumentStyleInfo[]> {
  const zip = await JSZip.loadAsync(buffer);

  const stylesXml = await zip.file('word/styles.xml')?.async('string') ?? '';
  const docXml = await zip.file('word/document.xml')?.async('string') ?? '';

  const allStyles = parseAllStyles(stylesXml);
  const usedIds = collectUsedStyleIds(docXml);

  const result: DocumentStyleInfo[] = [];

  // Always include "Normal" — body paragraphs use it implicitly even when
  // styles.xml has no explicit Normal definition (e.g. docx npm package output).
  if (!allStyles.has('Normal')) {
    allStyles.set('Normal', {
      id: 'Normal',
      name: 'Normal',
      alignment: 'left',
      fontSize: 11,
      spacingBefore: 0,
      spacingAfter: 8,
      lineSpacing: 1.08,
    });
  }

  for (const [id, info] of allStyles) {
    const type = classifyStyleType(info);
    result.push({ ...info, type });
  }

  // Sort: headings first by outlineLvl, then body/other styles alphabetically
  result.sort((a, b) => {
    if (a.type === 'heading' && b.type !== 'heading') return -1;
    if (a.type !== 'heading' && b.type === 'heading') return 1;
    if (a.type === 'heading' && b.type === 'heading') {
      return (a.outlineLvl ?? 9) - (b.outlineLvl ?? 9);
    }
    return a.name.localeCompare(b.name);
  });

  return result;
}

// ─── DocumentService ──────────────────────────────────────────────────────────

export class DocumentService {
  private sessions = new Map<string, SessionData>();

  generateSessionId() { return randomUUID(); }
  storeSession(id: string, buf: Buffer, name: string) { this.sessions.set(id, { buffer: buf, originalName: name }); }
  getSession(id: string) { return this.sessions.get(id); }
  hasSession(id: string) { return this.sessions.has(id); }
  getExportBuffer(id: string) {
    const s = this.sessions.get(id);
    return s ? { buffer: s.buffer, originalName: s.originalName } : null;
  }

  async applyStyles(buffer: Buffer, styles: Styles): Promise<Buffer> {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlStr = await zip.file('word/document.xml')?.async('string');
    if (!docXmlStr) throw new Error('word/document.xml not found');

    const doc = new DOMParser().parseFromString(docXmlStr, 'application/xml');
    const paragraphs = doc.getElementsByTagNameNS(W, 'p');

    let applied = 0;
    let skipped = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i] as Element;
      let pPr = findEl(para, 'pPr');
      const pStyleEl = pPr ? findEl(pPr, 'pStyle') : undefined;

      // Read styleId — use our robust reader, with XML-string regex as final fallback
      let styleId = pStyleEl ? readAttr(pStyleEl, 'val') : '';
      if (!styleId) {
        // Fallback: extract from raw XML via regex
        const outerXml = para.toString();
        const m = outerXml.match(/<w:pStyle[^>]+w:val="([^"]+)"/);
        if (m) styleId = m[1];
      }

      const config = styles[styleId] ?? (styleId === '' ? styles['Normal'] ?? null : null);
      if (!config) { skipped++; continue; }

      applied++;

      // Ensure <w:pPr> exists
      if (!pPr) {
        pPr = doc.createElementNS(W, 'w:pPr') as Element;
        para.insertBefore(pPr, para.firstChild);
      }

      // Alignment
      if (config.alignment !== undefined) {
        setWAttr(getOrCreate(pPr, 'jc'), 'val', alignToOoxml(config.alignment));
      }

      // Spacing
      if (config.spacingBefore !== undefined || config.spacingAfter !== undefined || config.lineSpacing !== undefined) {
        const spacing = getOrCreate(pPr, 'spacing');
        if (config.spacingBefore !== undefined) setWAttr(spacing, 'before', String(ptToTwips(config.spacingBefore)));
        if (config.spacingAfter !== undefined) setWAttr(spacing, 'after', String(ptToTwips(config.spacingAfter)));
        if (config.lineSpacing !== undefined) {
          setWAttr(spacing, 'line', String(Math.round(config.lineSpacing * 240)));
          setWAttr(spacing, 'lineRule', 'auto');
        }
      }

      // Indent (left)
      if (config.indent !== undefined) {
        setWAttr(getOrCreate(pPr, 'ind'), 'left', String(ptToTwips(config.indent)));
      }

      // First-line indent
      if (config.firstLineIndent !== undefined) {
        setWAttr(getOrCreate(pPr, 'ind'), 'firstLine', String(ptToTwips(config.firstLineIndent)));
      }

      // Per-run: fontSize, bold
      if (config.fontSize !== undefined || config.bold !== undefined) {
        const halfPts = config.fontSize !== undefined ? String(Math.round(config.fontSize * 2)) : null;
        const runs = para.getElementsByTagNameNS(W, 'r');
        for (let r = 0; r < runs.length; r++) {
          const run = runs[r] as Element;
          let rPr = run.getElementsByTagNameNS(W, 'rPr')[0] as Element | undefined;
          if (!rPr) {
            rPr = doc.createElementNS(W, 'w:rPr') as Element;
            run.insertBefore(rPr, run.firstChild);
          }

          if (halfPts !== null) {
            setWAttr(getOrCreate(rPr, 'sz'), 'val', halfPts);
            setWAttr(getOrCreate(rPr, 'szCs'), 'val', halfPts);
          }

          if (config.bold !== undefined) {
            // Remove existing <w:b> first to avoid duplicates
            const existingB = rPr.getElementsByTagNameNS(W, 'b')[0] as Element | undefined;
            if (existingB) rPr.removeChild(existingB);

            if (config.bold) {
              const bEl = doc.createElementNS(W, 'w:b') as Element;
              rPr.insertBefore(bEl, rPr.firstChild);
            }
          }
        }
      }
    }

    console.log(`[applyStyles] applied=${applied} skipped=${skipped}`);

    const modified = new XMLSerializer().serializeToString(doc);
    zip.file('word/document.xml', modified);
    return (await zip.generateAsync({ type: 'nodebuffer' })) as Buffer;
  }
}

export const documentService = new DocumentService();

// ─── Paragraph extraction ─────────────────────────────────────────────────────

export interface ParagraphInfo {
  index: number;
  text: string;
  fontSize: number | null;
  bold: boolean;
  italic: boolean;
  wordStyle: string; // existing Word styleId if any
  isEmpty: boolean;
}

export async function extractParagraphInfo(buffer: Buffer): Promise<ParagraphInfo[]> {
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml')?.async('string') ?? '';
  const doc = new DOMParser().parseFromString(docXml, 'application/xml');
  const paragraphs = doc.getElementsByTagNameNS(W, 'p');
  const result: ParagraphInfo[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i] as Element;
    const pPr = findEl(para, 'pPr');
    const pStyleEl = pPr ? findEl(pPr, 'pStyle') : undefined;
    const wordStyle = pStyleEl ? readAttr(pStyleEl, 'val') : 'Normal';

    // Extract text from all runs
    const runs = para.getElementsByTagNameNS(W, 'r');
    let text = '';
    let dominantFontSize: number | null = null;
    let isBold = false;
    let isItalic = false;

    for (let r = 0; r < runs.length; r++) {
      const run = runs[r] as Element;
      const rPr = findEl(run, 'rPr');
      const tEl = findEl(run, 't');
      if (tEl) text += tEl.textContent ?? '';
      if (rPr) {
        const szEl = findEl(rPr, 'sz');
        if (szEl) {
          const v = readAttr(szEl, 'val');
          if (v) dominantFontSize = parseInt(v, 10) / 2;
        }
        if (findEl(rPr, 'b')) isBold = true;
        if (findEl(rPr, 'i')) isItalic = true;
      }
    }

    result.push({
      index: i,
      text: text.trim(),
      fontSize: dominantFontSize,
      bold: isBold,
      italic: isItalic,
      wordStyle,
      isEmpty: text.trim().length === 0,
    });
  }

  return result;
}

