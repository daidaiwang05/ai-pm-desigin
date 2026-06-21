import { Router } from 'express';
import { previewController } from './preview.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// POST /api/v1/preview/:token/access - 访问预览（无需认证，但可能需要密码）
// 注意：此路由必须放在 authMiddleware 路由之前，避免路由冲突
router.post('/preview/:token/access', (req, res) => previewController.access(req, res));

// POST /api/v1/preview/:token/comments - 添加预览评论（无需认证）
router.post('/preview/:token/comments', (req, res) => previewController.addComment(req, res));

// GET /api/v1/preview/:token/comments - 获取预览评论（无需认证）
router.get('/preview/:token/comments', (req, res) => previewController.listComments(req, res));

// 以下路由需要认证
router.use(authMiddleware);

// POST /api/v1/previews - 创建预览链接
router.post('/previews', (req, res) => previewController.create(req as any, res));

// GET /api/v1/iterations/:iterationId/previews - 获取预览链接列表
router.get('/iterations/:iterationId/previews', (req, res) => previewController.list(req as any, res));

// DELETE /api/v1/previews/:id - 删除预览链接
router.delete('/previews/:id', (req, res) => previewController.delete(req as any, res));

// PATCH /api/v1/previews/:id/toggle - 切换预览链接状态
router.patch('/previews/:id/toggle', (req, res) => previewController.toggle(req as any, res));

export default router;
