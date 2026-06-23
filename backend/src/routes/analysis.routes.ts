import { Router } from 'express';
import { analysisController } from '../controllers/analysis.controller.js';

const router = Router();
router.post('/analyze', (req, res, next) => analysisController.analyzeStructure(req, res, next));
export default router;
