import { Router } from 'express';
import { iterationController } from './iteration.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// GET /api/v1/projects/:pid/iterations
router.get('/projects/:pid/iterations', authMiddleware, (req, res) => iterationController.list(req as any, res));

// POST /api/v1/projects/:pid/iterations
router.post('/projects/:pid/iterations', authMiddleware, (req, res) => iterationController.create(req as any, res));

// GET /api/v1/iterations/:id
router.get('/iterations/:id', authMiddleware, (req, res) => iterationController.getById(req as any, res));

// POST /api/v1/iterations/:id/set-current
router.post('/iterations/:id/set-current', authMiddleware, (req, res) => iterationController.setCurrent(req as any, res));

export default router;
