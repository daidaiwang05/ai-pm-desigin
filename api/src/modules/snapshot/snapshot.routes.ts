import { Router } from 'express';
import { snapshotController } from './snapshot.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// POST /api/v1/snapshots
router.post('/snapshots', authMiddleware, (req, res) => snapshotController.create(req as any, res));

// GET /api/v1/iterations/:iterationId/snapshots
router.get('/iterations/:iterationId/snapshots', authMiddleware, (req, res) => snapshotController.list(req as any, res));

// GET /api/v1/snapshots/:id
router.get('/snapshots/:id', authMiddleware, (req, res) => snapshotController.getById(req as any, res));

// POST /api/v1/snapshots/:id/restore
router.post('/snapshots/:id/restore', authMiddleware, (req, res) => snapshotController.restore(req as any, res));

// GET /api/v1/snapshots/diff
router.get('/snapshots/diff', authMiddleware, (req, res) => snapshotController.diff(req as any, res));

// DELETE /api/v1/snapshots/:id
router.delete('/snapshots/:id', authMiddleware, (req, res) => snapshotController.delete(req as any, res));

export default router;
