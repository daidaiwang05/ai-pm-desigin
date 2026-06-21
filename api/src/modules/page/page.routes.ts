import { Router } from 'express';
import { pageController } from './page.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// GET /api/v1/iterations/:iid/pages
router.get('/iterations/:iid/pages', authMiddleware, (req, res) => pageController.list(req as any, res));

// POST /api/v1/iterations/:iid/pages
router.post('/iterations/:iid/pages', authMiddleware, (req, res) => pageController.create(req as any, res));

// GET /api/v1/pages/:id
router.get('/pages/:id', authMiddleware, (req, res) => pageController.getById(req as any, res));

// PATCH /api/v1/pages/:id
router.patch('/pages/:id', authMiddleware, (req, res) => pageController.update(req as any, res));

// DELETE /api/v1/pages/:id
router.delete('/pages/:id', authMiddleware, (req, res) => pageController.delete(req as any, res));

// PATCH /api/v1/pages/:id/reorder
router.patch('/pages/:id/reorder', authMiddleware, (req, res) => pageController.reorderSingle(req as any, res));

// POST /api/v1/pages/:id/duplicate
router.post('/pages/:id/duplicate', authMiddleware, (req, res) => pageController.duplicate(req as any, res));

// PATCH /api/v1/iterations/:iid/pages/reorder
router.patch('/iterations/:iid/pages/reorder', authMiddleware, (req, res) => pageController.reorder(req as any, res));

export default router;
