/**
 * Browser-native DOCX style applicator.
 *
 * Two modes:
 * 1. applyStylesToDocx  — patches word/styles.xml (one change per Word style)
 * 2. applyGroupStyles   — patches word/document.xml (per-paragraph, for AI-detected groups)
 */

import JSZip from 'jszip';
import type { StylesConfig, DetectedStyleGroup } from '../types/document.types';

const W    = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// ── XML helpers ───────────────────────────────────────────────────────────────

function rAttr(el: Element, local: string): string {
  return el.getAttributeNS(W, local) ?? el.getAttribute(`w:${local}`) ?? '';
}

function wAttr(el: Element, local: string, value: string) {
  el.setAttribute(`w:${local}`, value);
}

function goc(parent: Element, local: string): Element {
  const existing = parent.getElementsByTagNameNS(W, local)[0] as Element | undefined;
  if (existing) return existing;
  const el = parent.ownerDocument!.createElementNS(W, `w:${local}`);
  parent.appendChild(el);
  return el;
}

function gocBefore(parent: Element, local: string, beforeLocal: string): Element {
  const existing = parent.getElementsByTagNameNS(W, local)[0] as Element | undefined;
  if (existing) return existing;
  const el = parent.ownerDocument!.createElementNS(W, `w:${local}`);
  const ref = parent.getElementsByTagNameNS(W, beforeLocal)[0] as Element | undefined;
  parent.insertBefore(el, ref ?? parent.firstChild);
  return el;
}

const ptToTwips = (pt: number) => String(Math.round(pt * 20));
const ptToHalfPt = (pt: number) => String(Math.round(pt * 2));

// ── Shared: apply StyleSpec to a pPr + rPr ───────────────────────────────────

function applySpecToPPr(pPr: Element, cfg: StylesConfig[string], xdoc: Document) {
  if (cfg.alignment) {
    wAttr(goc(pPr, 'jc'), 'val', cfg.alignment);
  }
  if (cfg.spacingBefore != null || cfg.spacingAfter != null || cfg.lineSpacing != null) {
    const sp = goc(pPr, 'spacing');
    if (cfg.spacingBefore != null) wAttr(sp, 'before',   ptToTwips(cfg.spacingBefore));
    if (cfg.spacingAfter  != null) wAttr(sp, 'after',    ptToTwips(cfg.spacingAfter));
    if (cfg.lineSpacing   != null) {
      wAttr(sp, 'line',     String(Math.round(cfg.lineSpacing * 240)));
      wAttr(sp, 'lineRule', 'auto');
    }
  }
  if (cfg.indent != null || cfg.firstLineIndent != null) {
    const ind = goc(pPr, 'ind');
    if (cfg.indent          != null) wAttr(ind, 'left',      ptToTwips(cfg.indent));
    if (cfg.firstLineIndent != null) wAttr(ind, 'firstLine', ptToTwips(cfg.firstLineIndent));
  }
}

function applySpecToRPr(rPr: Element, cfg: StylesConfig[string], xdoc: Document) {
  if (cfg.fontSize != null) {
    const half = ptToHalfPt(cfg.fontSize);
    wAttr(goc(rPr, 'sz'),   'val', half);
    wAttr(goc(rPr, 'szCs'), 'val', half);
  }
  if (cfg.bold != null) {
    const existing = rPr.getElementsByTagNameNS(W, 'b')[0] as Element | undefined;
    if (cfg.bold && !existing) {
      rPr.insertBefore(xdoc.createElementNS(W, 'w:b'), rPr.firstChild);
    } else if (!cfg.bold && existing) {
      existing.remove();
    }
  }
}

// ── Mode 1: Patch styles.xml (Word style definitions) ────────────────────────

export async function applyStylesToDocx(
  file: File | Blob,
  config: StylesConfig,
): Promise<Blob> {
  const zip = await JSZip.loadAsync(file);

  const stylesEntry = zip.file('word/styles.xml');
  if (!stylesEntry) throw new Error('word/styles.xml not found.');

  const xml  = await stylesEntry.async('string');
  const parser = new DOMParser();
  const xdoc   = parser.parseFromString(xml, 'application/xml');

  const parseErr = xdoc.querySelector('parsererror');
  if (parseErr) throw new Error(`styles.xml parse error: ${parseErr.textContent}`);

  const styleEls   = Array.from(xdoc.getElementsByTagNameNS(W, 'style')) as Element[];
  const existingIds = new Set(styleEls.map(el => rAttr(el, 'styleId')));

  // Create definitions for styles absent from styles.xml (e.g. "Normal")
  const stylesRoot = xdoc.getElementsByTagNameNS(W, 'styles')[0] as Element | undefined;
  if (stylesRoot) {
    for (const id of Object.keys(config)) {
      if (existingIds.has(id)) continue;
      const el = xdoc.createElementNS(W, 'w:style');
      el.setAttribute('w:type', 'paragraph');
      el.setAttribute('w:styleId', id);
      if (id === 'Normal') el.setAttribute('w:default', '1');
      const nm = xdoc.createElementNS(W, 'w:name');
      nm.setAttribute('w:val', id === 'Normal' ? 'Normal' : id.toLowerCase());
      el.appendChild(nm);
      stylesRoot.insertBefore(el, stylesRoot.firstChild);
      styleEls.push(el);
      existingIds.add(id);
    }
  }

  for (const styleEl of styleEls) {
    const id  = rAttr(styleEl, 'styleId');
    const cfg = config[id];
    if (!cfg) continue;

    const pPr = goc(styleEl, 'pPr');
    applySpecToPPr(pPr, cfg, xdoc as unknown as Document);

    if (cfg.fontSize != null || cfg.bold != null) {
      const rPr = goc(styleEl, 'rPr');
      applySpecToRPr(rPr, cfg, xdoc as unknown as Document);
    }
  }

  const serializer = new XMLSerializer();
  zip.file('word/styles.xml', serializer.serializeToString(xdoc));

  return zip.generateAsync({ type: 'blob', mimeType: MIME });
}

// ── Mode 2: Patch document.xml (AI-detected paragraph groups) ─────────────────

export async function applyGroupStylesToDocx(
  file: File | Blob,
  groups: DetectedStyleGroup[],
  config: StylesConfig,
): Promise<Blob> {
  const zip = await JSZip.loadAsync(file);

  const docEntry = zip.file('word/document.xml');
  if (!docEntry) throw new Error('word/document.xml not found.');

  const xml    = await docEntry.async('string');
  const parser = new DOMParser();
  const xdoc   = parser.parseFromString(xml, 'application/xml');

  const parseErr = xdoc.querySelector('parsererror');
  if (parseErr) throw new Error(`document.xml parse error: ${parseErr.textContent}`);

  const allParas = Array.from(xdoc.getElementsByTagNameNS(W, 'p')) as Element[];

  for (const group of groups) {
    const cfg = config[group.id];
    if (!cfg) continue;

    for (const idx of group.paragraphIndices) {
      const para = allParas[idx];
      if (!para) continue;

      // Ensure <w:pPr>
      const pPr = gocBefore(para, 'pPr', 'r');
      applySpecToPPr(pPr, cfg, xdoc as unknown as Document);

      // Apply run-level formatting to all <w:r> in this paragraph
      if (cfg.fontSize != null || cfg.bold != null) {
        const runs = Array.from(para.getElementsByTagNameNS(W, 'r')) as Element[];
        for (const run of runs) {
          const rPr = gocBefore(run, 'rPr', 't');
          applySpecToRPr(rPr, cfg, xdoc as unknown as Document);
        }
      }
    }
  }

  const serializer = new XMLSerializer();
  zip.file('word/document.xml', serializer.serializeToString(xdoc));

  return zip.generateAsync({ type: 'blob', mimeType: MIME });
}

// ── Combined: apply both Word styles + detected groups ────────────────────────

export async function applyAllStylesToDocx(
  file: File | Blob,
  wordConfig: StylesConfig,
  groups: DetectedStyleGroup[],
  groupConfig: StylesConfig,
): Promise<Blob> {
  // Apply Word styles first (modifies styles.xml)
  let blob = await applyStylesToDocx(file, wordConfig);
  // Then apply group overrides (modifies document.xml on top of that)
  const activeGroups = groups.filter(g => groupConfig[g.id]);
  if (activeGroups.length > 0) {
    blob = await applyGroupStylesToDocx(blob, activeGroups, groupConfig);
  }
  return blob;
}
