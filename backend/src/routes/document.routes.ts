import { Router } from 'express';
import { upload } from '../config/multer.config.js';
import { documentController } from '../controllers/document.controller.js';
import validateRequest from '../middlewares/validateRequest.middleware.js';
import { PreviewRequestSchema } from '../schemas/document.schema.js';

const router = Router();

router.post(
  '/upload',
  upload.single('file'),
  documentController.handleUpload.bind(documentController),
);

router.post(
  '/preview',
  validateRequest(PreviewRequestSchema),
  documentController.handlePreview.bind(documentController),
);

/**
 * POST /api/documents/export
 * Body: { sessionId, styles? }
 * Applies styles then streams the aligned .docx as a download.
 */
router.post(
  '/export',
  documentController.handleExport.bind(documentController),
);

export default router;
