import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// POST /api/v1/analytics/:previewLinkId/access - 记录访问（无需认证）
router.post('/analytics/:previewLinkId/access', (req, res) => analyticsController.logAccess(req as any, res));

// GET /api/v1/analytics/:previewLinkId/stats - 获取预览链接统计（需要认证）
router.get('/analytics/:previewLinkId/stats', authMiddleware, (req, res) => analyticsController.getStats(req as any, res));

// GET /api/v1/analytics/iterations/:iterationId/stats - 获取迭代统计（需要认证）
router.get('/analytics/iterations/:iterationId/stats', authMiddleware, (req, res) => analyticsController.getIterationStats(req as any, res));

export default router;
