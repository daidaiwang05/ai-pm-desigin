import { Router } from 'express';
import { verificationController } from './verification.controller';
import { verificationRateLimit, authRateLimit } from '../../middleware/rateLimit';

const router = Router();

// POST /api/v1/verification/send-code - 发送验证码（带速率限制）
router.post('/verification/send-code', verificationRateLimit, (req, res) => verificationController.sendCode(req, res));

// POST /api/v1/verification/verify-code - 验证验证码
router.post('/verification/verify-code', (req, res) => verificationController.verifyCode(req, res));

// POST /api/v1/auth/phone-login - 手机号验证码登录（带速率限制）
router.post('/auth/phone-login', authRateLimit, (req, res) => verificationController.phoneLogin(req, res));

export default router;
