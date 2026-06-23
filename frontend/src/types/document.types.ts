export interface StyleSpec {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  spacingBefore?: number;
  spacingAfter?: number;
  lineSpacing?: number;
  indent?: number;
  firstLineIndent?: number;
}

export interface DocumentStyleInfo {
  id: string;
  name: string;
  type: 'heading' | 'body' | 'other';
  outlineLvl?: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
  fontSize?: number;
  bold?: boolean;
  spacingBefore?: number;
  spacingAfter?: number;
  lineSpacing?: number;
  indent?: number;
  firstLineIndent?: number;
}

// Map of styleId -> user overrides
export type StylesConfig = Record<string, StyleSpec>;

export type SemanticType = 'heading1' | 'heading2' | 'heading3' | 'body' | 'caption' | 'other';

export interface DetectedStyleGroup {
  id: string;
  label: string;
  semanticType: SemanticType;
  paragraphIndices: number[];
  sampleText: string;
  recommendedStyle: StyleSpec; // AI-generated perfect formatting
}
