import { Request, Response } from 'express';
import { verificationService } from './verification.service';
import { sendSuccess, sendError } from '../../utils/response';
import { generateToken } from '../../middleware/auth';

export class VerificationController {
  /**
   * 发送验证码
   */
  async sendCode(req: Request, res: Response): Promise<void> {
    try {
      const { phone, purpose } = req.body;

      if (!phone) {
        sendError(res, 'VALIDATION_ERROR', '手机号为必填项', 400);
        return;
      }

      // 验证手机号格式
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        sendError(res, 'VALIDATION_ERROR', '手机号格式不正确', 400);
        return;
      }

      const result = await verificationService.sendCode(
        phone,
        purpose || 'login'
      );
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === '发送过于频繁，请稍后再试') {
        sendError(res, 'RATE_LIMITED', error.message, 429);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  /**
   * 验证验证码
   */
  async verifyCode(req: Request, res: Response): Promise<void> {
    try {
      const { phone, code, purpose } = req.body;

      if (!phone || !code) {
        sendError(res, 'VALIDATION_ERROR', '手机号和验证码为必填项', 400);
        return;
      }

      const result = await verificationService.verifyCode(
        phone,
        code,
        purpose || 'comment'
      );
      sendSuccess(res, { verified: result });
    } catch (error: any) {
      if (error.message === '验证码无效或已过期') {
        sendError(res, 'UNAUTHORIZED', error.message, 401);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  /**
   * 验证码登录
   */
  async phoneLogin(req: Request, res: Response): Promise<void> {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        sendError(res, 'VALIDATION_ERROR', '手机号和验证码为必填项', 400);
        return;
      }

      const user = await verificationService.phoneLogin(phone, code);
      const token = generateToken(user.id);

      sendSuccess(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
        },
      });
    } catch (error: any) {
      if (error.message === '验证码无效或已过期') {
        sendError(res, 'UNAUTHORIZED', error.message, 401);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }
}

export const verificationController = new VerificationController();
