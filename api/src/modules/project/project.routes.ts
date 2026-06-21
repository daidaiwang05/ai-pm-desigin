import { Router } from 'express';
import { projectController } from './project.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// GET /api/v1/projects
router.get('/', authMiddleware, (req, res) => projectController.list(req as any, res));

// POST /api/v1/projects
router.post('/', authMiddleware, (req, res) => projectController.create(req as any, res));

// GET /api/v1/projects/:id
router.get('/:id', authMiddleware, (req, res) => projectController.getById(req as any, res));

// PATCH /api/v1/projects/:id
router.patch('/:id', authMiddleware, (req, res) => projectController.update(req as any, res));

// DELETE /api/v1/projects/:id
router.delete('/:id', authMiddleware, (req, res) => projectController.delete(req as any, res));

export default router;
