import { Router } from 'express';
import { exportController } from './export.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// GET /api/v1/iterations/:iterationId/export/markdown
router.get('/iterations/:iterationId/export/markdown', authMiddleware, (req, res) => exportController.exportMarkdown(req as any, res));

// GET /api/v1/iterations/:iterationId/export/json
router.get('/iterations/:iterationId/export/json', authMiddleware, (req, res) => exportController.exportJson(req as any, res));

// GET /api/v1/iterations/:iterationId/export/html
router.get('/iterations/:iterationId/export/html', authMiddleware, (req, res) => exportController.exportHtml(req as any, res));

// GET /api/v1/iterations/:iterationId/export/annotations
router.get('/iterations/:iterationId/export/annotations', authMiddleware, (req, res) => exportController.exportAnnotations(req as any, res));

export default router;
