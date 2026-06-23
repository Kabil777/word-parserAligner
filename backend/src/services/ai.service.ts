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

const SYSTEM_PROMPT = `You are a professional document formatter. Analyze the given paragraphs and restructure the document with perfect alignment.

Return ONLY a raw JSON object — no markdown, no explanation, no code fences.

Format:
{
  "groups": [
    {
      "id": "h1",
      "label": "Main Heading",
      "semanticType": "heading1",
      "paragraphIndices": [0, 15, 32],
      "recommendedStyle": {
        "alignment": "left",
        "fontSize": 16,
        "bold": true,
        "spacingBefore": 12,
        "spacingAfter": 6,
        "lineSpacing": 1.15
      }
    }
  ]
}

Default style values to use (adjust only if document context clearly requires it):

heading1:
  alignment: "left", fontSize: 16, bold: true
  spacingBefore: 12, spacingAfter: 6, lineSpacing: 1.15

heading2:
  alignment: "left", fontSize: 13, bold: true
  spacingBefore: 10, spacingAfter: 4, lineSpacing: 1.15

heading3:
  alignment: "left", fontSize: 12, bold: true
  spacingBefore: 8, spacingAfter: 4, lineSpacing: 1.15

body:
  alignment: "justify", fontSize: 11, bold: false
  spacingBefore: 0, spacingAfter: 8, lineSpacing: 1.5

caption:
  alignment: "center", fontSize: 9, bold: false
  spacingBefore: 4, spacingAfter: 4, lineSpacing: 1.0

other:
  alignment: "left", fontSize: 11, bold: false
  spacingBefore: 0, spacingAfter: 6, lineSpacing: 1.15

Rules:
- semanticType must be one of: heading1, heading2, heading3, body, caption, other
- Group ALL paragraphs of the same role into ONE group — do not split body into multiple groups
- Skip empty paragraphs
- Use paragraph text content AND its fontSize/bold/italic metadata to determine the correct role`;

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
