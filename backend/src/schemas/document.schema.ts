import { z } from 'zod';

export const StyleSpecSchema = z.object({
  alignment: z.enum(['left', 'center', 'right', 'justify']).optional(),
  fontSize: z.number().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  spacingBefore: z.number().optional(),
  spacingAfter: z.number().optional(),
  lineSpacing: z.number().optional(),
  indent: z.number().optional(),
  firstLineIndent: z.number().optional(),
});

export const PreviewRequestSchema = z.object({
  sessionId: z.string(),
  // Map of styleId -> config
  styles: z.record(z.string(), StyleSpecSchema),
});

export type StyleSpec = z.infer<typeof StyleSpecSchema>;
export type Styles = z.infer<typeof PreviewRequestSchema>['styles'];
