import OpenAI from 'openai';
import type { ParagraphInfo } from './document.service.js';

export interface RecommendedStyle {
  alignment: 'left' | 'center' | 'right' | 'justify';
  fontSize?: number;
  bold?: boolean;
  spacingBefore?: number;
  spacingAfter?: number;
  lineSpacing?: number;
  indent?: number;
  firstLineIndent?: number;
}

export interface DetectedGroup {
  id: string;
  label: string;
  semanticType: 'heading1' | 'heading2' | 'heading3' | 'body' | 'caption' | 'other';
  paragraphIndices: number[];
  sampleText: string;
  recommendedStyle: RecommendedStyle;
}

const SYSTEM_PROMPT = `You are a professional document formatter AI.
Given paragraphs with their formatting metadata, you must:
1. Identify the semantic role of each paragraph group (heading1, heading2, heading3, body, caption, other)
2. Apply PERFECT professional formatting rules to each group

Return ONLY valid JSON — no explanation, no markdown fences, just the raw JSON object.

Format:
{
  "groups": [
    {
      "id": "h1",
      "label": "Main Heading",
      "semanticType": "heading1",
      "paragraphIndices": [0, 15, 32],
      "recommendedStyle": {
        "alignment": "center",
        "fontSize": 16,
        "bold": true,
        "spacingBefore": 12,
        "spacingAfter": 6,
        "lineSpacing": 1.15
      }
    }
  ]
}

Formatting rules to follow:
- heading1: center or left aligned, largest font (14-18pt), bold, generous spacing
- heading2: left aligned, medium font (12-14pt), bold, moderate spacing
- heading3: left aligned, slightly larger than body (11-12pt), bold or italic
- body: justify aligned, standard font (10-12pt), 1.15-1.5 line spacing, 8pt spacing after
- caption: center aligned, small font (9-10pt), italic
- Do NOT include empty paragraphs.
- Group all paragraphs of the same semantic role into ONE group.
- semanticType must be one of: heading1, heading2, heading3, body, caption, other.`;

export async function analyzeDocumentStructure(
  paragraphs: ParagraphInfo[],
  apiKey: string,
): Promise<DetectedGroup[]> {
  const client = new OpenAI({
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey,
  });

  // Send only non-empty paragraphs, limit to 200 for token budget
  const payload = paragraphs
    .filter(p => !p.isEmpty)
    .slice(0, 200)
    .map(p => ({
      index: p.index,
      text: p.text.slice(0, 120),
      fontSize: p.fontSize,
      bold: p.bold,
      italic: p.italic,
      wordStyle: p.wordStyle,
    }));

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Paragraphs:\n${JSON.stringify(payload, null, 2)}` },
      ],
      temperature: 0.1,
      max_tokens: 4096,
      stream: false,
    });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    // Surface meaningful errors: bad key, quota, model not found
    throw new Error(`NVIDIA API error: ${msg.slice(0, 200)}`);
  }

  const raw = completion.choices[0]?.message?.content ?? '{"groups":[]}';

  // Strip markdown code fences if present
  let jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  // If the model returned reasoning before JSON, extract just the JSON object
  const jsonStart = jsonStr.indexOf('{');
  if (jsonStart > 0) jsonStr = jsonStr.slice(jsonStart);

  let parsed: { groups: DetectedGroup[] };
  try {
    parsed = JSON.parse(jsonStr) as { groups: DetectedGroup[] };
  } catch {
    console.error('[ai.service] Failed to parse JSON from model:', raw.slice(0, 300));
    parsed = { groups: [] };
  }

  // Attach sampleText
  const indexToText = new Map(paragraphs.map(p => [p.index, p.text]));
  return parsed.groups.map(g => ({
    ...g,
    sampleText: indexToText.get(g.paragraphIndices[0] ?? -1) ?? '',
  }));
}
