import { Router } from 'express';
import { componentController } from './component.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// GET /api/v1/pages/:pageId/components
router.get('/pages/:pageId/components', authMiddleware, (req, res) => componentController.list(req as any, res));

// POST /api/v1/pages/:pageId/components
router.post('/pages/:pageId/components', authMiddleware, (req, res) => componentController.create(req as any, res));

// POST /api/v1/pages/:pageId/components/batch
router.post('/pages/:pageId/components/batch', authMiddleware, (req, res) => componentController.batchCreate(req as any, res));

// PATCH /api/v1/components/:id
router.patch('/components/:id', authMiddleware, (req, res) => componentController.update(req as any, res));

// DELETE /api/v1/components/:id
router.delete('/components/:id', authMiddleware, (req, res) => componentController.delete(req as any, res));

export default router;
