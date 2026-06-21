import { Response } from 'express';
import { analyticsService } from './analytics.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class AnalyticsController {
  /**
   * 记录访问（无需认证）
   */
  async logAccess(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { previewLinkId } = req.params;
      const { visitorId } = req.body;

      if (!visitorId) {
        sendError(res, 'VALIDATION_ERROR', 'visitorId 为必填项', 400);
        return;
      }

      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const referer = req.headers.referer;

      await analyticsService.logAccess({
        previewLinkId,
        visitorId,
        ip,
        userAgent,
        referer,
      });

      sendSuccess(res, { message: '访问已记录' });
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  /**
   * 获取预览链接的统计数据
   */
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { previewLinkId } = req.params;
      const stats = await analyticsService.getStats(previewLinkId);
      sendSuccess(res, stats);
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  /**
   * 获取迭代版本的统计数据
   */
  async getIterationStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { iterationId } = req.params;
      const stats = await analyticsService.getIterationStats(iterationId);
      sendSuccess(res, stats);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }
}

export const analyticsController = new AnalyticsController();
