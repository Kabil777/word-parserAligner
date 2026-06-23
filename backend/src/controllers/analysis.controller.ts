import type { Request, Response, NextFunction } from 'express';
import { documentService, extractParagraphInfo } from '../services/document.service.js';
import { analyzeDocumentStructure } from '../services/ai.service.js';

export class AnalysisController {
  async analyzeStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, apiKey: clientKey } = req.body as { sessionId: string; apiKey?: string };

      // Use client-supplied key, or fall back to server .env key
      const apiKey = clientKey || process.env.NVIDIA_API_KEY || '';

      if (!sessionId) {
        res.status(400).json({ success: false, error: 'sessionId is required' });
        return;
      }
      if (!apiKey) {
        res.status(400).json({ success: false, error: 'NVIDIA API key is required (provide apiKey in body or set NVIDIA_API_KEY in server .env)' });
        return;
      }

      const session = documentService.getSession(sessionId);
      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      const paragraphs = await extractParagraphInfo(session.buffer);
      const detectedGroups = await analyzeDocumentStructure(paragraphs, apiKey);
      res.json({ success: true, data: { detectedGroups } });
    } catch (err) {
      next(err);
    }
  }
}

export const analysisController = new AnalysisController();
