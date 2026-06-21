import { Router } from 'express';
import { annotationController } from './annotation.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// GET /api/v1/iterations/:iid/annotations
router.get('/iterations/:iid/annotations', authMiddleware, (req, res) => annotationController.list(req as any, res));

// GET /api/v1/iterations/:iid/annotations/stats
router.get('/iterations/:iid/annotations/stats', authMiddleware, (req, res) => annotationController.getStats(req as any, res));

// POST /api/v1/annotations
router.post('/annotations', authMiddleware, (req, res) => annotationController.create(req as any, res));

// PATCH /api/v1/annotations/:id
router.patch('/annotations/:id', authMiddleware, (req, res) => annotationController.update(req as any, res));

// DELETE /api/v1/annotations/:id
router.delete('/annotations/:id', authMiddleware, (req, res) => annotationController.delete(req as any, res));

// POST /api/v1/annotations/:id/comments
router.post('/annotations/:id/comments', authMiddleware, (req, res) => annotationController.addComment(req as any, res));

// DELETE /api/v1/annotations/:id/comments/:commentId
router.delete('/annotations/:id/comments/:commentId', authMiddleware, (req, res) => annotationController.deleteComment(req as any, res));

export default router;
