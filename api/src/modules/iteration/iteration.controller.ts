import { Response } from 'express';
import { iterationService } from './iteration.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class IterationController {
  // 辅助方法：检查用户是否已认证
  private ensureAuthenticated(req: AuthRequest, res: Response): string | null {
    if (!req.userId) {
      sendError(res, 'UNAUTHORIZED', '未提供认证令牌', 401);
      return null;
    }
    return req.userId;
  }
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const iterations = await iterationService.list(req.params.pid);
      sendSuccess(res, iterations);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const { name, version, description, basedOnId } = req.body;

      if (!name || !version) {
        sendError(res, 'VALIDATION_ERROR', '名称和版本号为必填项', 400);
        return;
      }

      const iteration = await iterationService.create(req.params.pid, userId, {
        name,
        version,
        description,
        basedOnId,
      });
      sendSuccess(res, iteration, 201);
    } catch (error: any) {
      if (error.message === '项目不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const iteration = await iterationService.getById(req.params.id, userId);
      sendSuccess(res, iteration);
    } catch (error: any) {
      if (error.message === '迭代版本不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message === '无权访问此项目') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async setCurrent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const iteration = await iterationService.setCurrent(req.params.id, userId);
      sendSuccess(res, iteration);
    } catch (error: any) {
      if (error.message === '迭代版本不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message === '无权访问此项目') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }
}

export const iterationController = new IterationController();
