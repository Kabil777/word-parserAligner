import type { Request, Response, NextFunction } from 'express';
import { documentService, parseDocumentStyles } from '../services/document.service.js';
import type { Styles } from '../schemas/document.schema.js';

export class DocumentController {
  /**
   * POST /api/documents/upload
   * Accepts a multipart .docx file upload.
   * Stores the buffer in session and returns { success, sessionId, originalName, documentStyles }.
   */
  async handleUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const sessionId = documentService.generateSessionId();
      documentService.storeSession(sessionId, file.buffer, file.originalname);

      // Parse all paragraph styles actually used in this document
      const documentStyles = await parseDocumentStyles(file.buffer);

      res.status(200).json({
        success: true,
        sessionId,
        originalName: file.originalname,
        documentStyles,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/documents/preview
   * Body: { sessionId, styles }
   * Applies styles in-memory and returns the modified .docx binary.
   */
  async handlePreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, styles } = req.body as { sessionId: string; styles: Styles };

      const session = documentService.getSession(sessionId);
      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      const styledBuffer = await documentService.applyStyles(session.buffer, styles);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'inline; filename="preview.docx"');
      res.send(styledBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/documents/export
   * Body: { sessionId, styles }
   * Applies styles then streams the modified .docx as a download.
   */
  async handleExport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, styles } = req.body as { sessionId: string; styles?: Styles };

      const exportData = documentService.getExportBuffer(sessionId);
      if (!exportData) {
        res.status(404).json({ success: false, error: 'Session not found or expired' });
        return;
      }

      const { buffer, originalName } = exportData;

      // Apply styles if provided, otherwise export original
      const finalBuffer = styles
        ? await documentService.applyStyles(buffer, styles)
        : buffer;

      const filename = originalName.endsWith('.docx')
        ? originalName.replace('.docx', '_aligned.docx')
        : `${originalName}_aligned.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', finalBuffer.length);
      res.send(finalBuffer);
    } catch (error) {
      next(error);
    }
  }
}

// Singleton instance shared across routes
export const documentController = new DocumentController();
