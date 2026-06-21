import { Router } from 'express';
import { aiController } from './ai.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// 健康检查（不需要认证）
router.get('/ai/health', (req, res) => aiController.healthCheck(req, res));

// 以下端点需要认证
router.post('/ai/generate', authMiddleware, (req, res) => aiController.generate(req, res));
router.post('/ai/generate/stream', authMiddleware, (req, res) => aiController.generateStream(req, res));
router.post('/ai/refine', authMiddleware, (req, res) => aiController.refine(req, res));
router.post('/ai/add-component', authMiddleware, (req, res) => aiController.addComponent(req, res));
router.post('/ai/generate-prd', authMiddleware, (req, res) => aiController.generatePRD(req, res));
router.get('/ai/components', authMiddleware, (req, res) => aiController.getComponents(req, res));
router.get('/ai/component-props/:type', authMiddleware, (req, res) => aiController.getComponentProps(req, res));

export default router;
