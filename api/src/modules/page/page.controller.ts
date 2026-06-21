import { Response } from 'express';
import { pageService } from './page.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class PageController {
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
      const pages = await pageService.list(req.params.iid);
      sendSuccess(res, pages);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const { name, slug, description, pageType, deviceType, viewportW, viewportH, bgColor } = req.body;

      if (!name) {
        sendError(res, 'VALIDATION_ERROR', '页面名称为必填项', 400);
        return;
      }

      const page = await pageService.create(req.params.iid, userId, {
        name,
        slug,
        description,
        pageType,
        deviceType,
        viewportW,
        viewportH,
        bgColor,
      });
      sendSuccess(res, page, 201);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const page = await pageService.getById(req.params.id, userId);
      sendSuccess(res, page);
    } catch (error: any) {
      if (error.message === '页面不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message === '无权访问此项目') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      // 白名单过滤，防止 mass assignment
      const allowedFields = ['name', 'slug', 'description', 'bgColor', 'sortOrder', 'deviceType', 'viewportW', 'viewportH', 'pageType'];
      const filteredData: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          filteredData[key] = req.body[key];
        }
      }
      const page = await pageService.update(req.params.id, userId, filteredData);
      sendSuccess(res, page);
    } catch (error: any) {
      if (error.message === '页面不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message === '无权访问此项目') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      await pageService.delete(req.params.id, userId);
      sendSuccess(res, { message: '页面已删除' });
    } catch (error: any) {
      if (error.message === '页面不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message === '无权访问此项目') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async reorder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { pageOrders } = req.body;
      if (!Array.isArray(pageOrders)) {
        sendError(res, 'VALIDATION_ERROR', 'pageOrders 必须是数组', 400);
        return;
      }
      await pageService.reorder(req.params.iid, pageOrders);
      sendSuccess(res, { message: '排序已更新' });
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  async reorderSingle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const { sortOrder } = req.body;
      if (sortOrder === undefined) {
        sendError(res, 'VALIDATION_ERROR', 'sortOrder 为必填项', 400);
        return;
      }
      // 传递 userId 进行权限检查
      const page = await pageService.update(req.params.id, userId, { sortOrder });
      sendSuccess(res, page);
    } catch (error: any) {
      if (error.message === '无权访问此项目') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async duplicate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const page = await pageService.duplicate(req.params.id, userId);
      sendSuccess(res, page, 201);
    } catch (error: any) {
      if (error.message === '页面不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }
}

export const pageController = new PageController();
