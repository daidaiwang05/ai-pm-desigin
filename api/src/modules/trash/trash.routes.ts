import { Router } from 'express';
import { trashController } from './trash.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// GET /api/v1/trash/projects - 获取已删除的项目
router.get('/trash/projects', authMiddleware, (req, res) => trashController.getDeletedProjects(req as any, res));

// GET /api/v1/trash/projects/:projectId/pages - 获取已删除的页面
router.get('/trash/projects/:projectId/pages', authMiddleware, (req, res) => trashController.getDeletedPages(req as any, res));

// POST /api/v1/trash/projects/:id/restore - 恢复项目
router.post('/trash/projects/:id/restore', authMiddleware, (req, res) => trashController.restoreProject(req as any, res));

// POST /api/v1/trash/pages/:id/restore - 恢复页面
router.post('/trash/pages/:id/restore', authMiddleware, (req, res) => trashController.restorePage(req as any, res));

// DELETE /api/v1/trash/projects/:id/permanent - 永久删除项目
router.delete('/trash/projects/:id/permanent', authMiddleware, (req, res) => trashController.permanentDeleteProject(req as any, res));

// DELETE /api/v1/trash/pages/:id/permanent - 永久删除页面
router.delete('/trash/pages/:id/permanent', authMiddleware, (req, res) => trashController.permanentDeletePage(req as any, res));

// POST /api/v1/trash/cleanup - 清空回收站
router.post('/trash/cleanup', authMiddleware, (req, res) => trashController.cleanup(req as any, res));

export default router;
