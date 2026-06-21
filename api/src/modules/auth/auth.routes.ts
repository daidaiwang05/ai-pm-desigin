import { Router } from 'express';
import { authController } from './auth.controller';
import { ssoService } from './sso.service';
import { authMiddleware } from '../../middleware/auth';
import { authRateLimit } from '../../middleware/rateLimit';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

// POST /api/v1/auth/register（带速率限制）
router.post('/register', authRateLimit, (req, res) => authController.register(req, res));

// POST /api/v1/auth/login（带速率限制）
router.post('/login', authRateLimit, (req, res) => authController.login(req, res));

// GET /api/v1/auth/me
router.get('/me', authMiddleware, (req, res) => authController.getMe(req as any, res));

// ==================== SSO ====================

// GET /api/v1/auth/sso/:provider - 获取 SSO 授权 URL
router.get('/sso/:provider', (req, res) => {
  try {
    const provider = req.params.provider as 'google' | 'github' | 'wechat';
    const url = ssoService.getAuthUrl(provider);
    sendSuccess(res, { url });
  } catch (error: any) {
    sendError(res, 'BAD_REQUEST', error.message, 400);
  }
});

// GET /api/v1/auth/callback/:provider - SSO 回调
router.get('/callback/:provider', async (req, res) => {
  try {
    const provider = req.params.provider as 'google' | 'github' | 'wechat';
    const code = req.query.code as string;

    if (!code) {
      sendError(res, 'VALIDATION_ERROR', '缺少授权码', 400);
      return;
    }

    const result = await ssoService.handleCallback(provider, code);
    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

export default router;
