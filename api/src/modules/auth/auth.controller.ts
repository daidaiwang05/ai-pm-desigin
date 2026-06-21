import { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        sendError(res, 'VALIDATION_ERROR', '邮箱、密码和姓名为必填项', 400);
        return;
      }

      if (password.length < 6) {
        sendError(res, 'VALIDATION_ERROR', '密码长度不能少于 6 位', 400);
        return;
      }

      const result = await authService.register({ email, password, name });
      sendSuccess(res, result, 201);
    } catch (error: any) {
      if (error.message === '该邮箱已注册') {
        sendError(res, 'CONFLICT', error.message, 409);
      } else {
        sendError(res, 'INTERNAL_ERROR', '注册失败', 500);
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        sendError(res, 'VALIDATION_ERROR', '邮箱和密码为必填项', 400);
        return;
      }

      const result = await authService.login({ email, password });
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === '邮箱或密码错误' || error.message === '账号已被禁用') {
        sendError(res, 'UNAUTHORIZED', error.message, 401);
      } else {
        sendError(res, 'INTERNAL_ERROR', '登录失败', 500);
      }
    }
  }

  async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getMe(req.userId!);
      sendSuccess(res, user);
    } catch (error: any) {
      sendError(res, 'NOT_FOUND', error.message, 404);
    }
  }
}

export const authController = new AuthController();
