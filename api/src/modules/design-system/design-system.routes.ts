import { Router } from 'express';
import { designSystemController } from './design-system.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// GET /api/v1/projects/:projectId/design-system - 获取项目设计规范
router.get('/projects/:projectId/design-system', authMiddleware, (req, res) => designSystemController.getByProject(req as any, res));

// PUT /api/v1/projects/:projectId/design-system - 创建/更新设计规范
router.put('/projects/:projectId/design-system', authMiddleware, (req, res) => designSystemController.upsert(req as any, res));

// GET /api/v1/projects/:projectId/design-system/tokens - 获取设计 Token
router.get('/projects/:projectId/design-system/tokens', authMiddleware, (req, res) => designSystemController.getTokens(req as any, res));

// PUT /api/v1/projects/:projectId/design-system/tokens - 更新设计 Token
router.put('/projects/:projectId/design-system/tokens', authMiddleware, (req, res) => designSystemController.updateTokens(req as any, res));

// GET /api/v1/design-system/templates - 获取预设模板
router.get('/design-system/templates', authMiddleware, (req, res) => designSystemController.getTemplates(req as any, res));

// GET /api/v1/projects/:projectId/design-system/css - 生成 CSS 变量
router.get('/projects/:projectId/design-system/css', authMiddleware, (req, res) => designSystemController.generateCss(req as any, res));

export default router;
