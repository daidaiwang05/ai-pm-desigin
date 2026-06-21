import { Response } from 'express';
import { componentService } from './component.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class ComponentController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const components = await componentService.list(req.params.pageId);
      sendSuccess(res, components);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { componentType, name, props, layout, styles, interactions, parentId, sortOrder } = req.body;

      if (!componentType || !layout) {
        sendError(res, 'VALIDATION_ERROR', '组件类型和布局信息为必填项', 400);
        return;
      }

      if (typeof layout.x !== 'number' || typeof layout.y !== 'number' ||
          typeof layout.w !== 'number' || typeof layout.h !== 'number') {
        sendError(res, 'VALIDATION_ERROR', '布局信息必须包含 x, y, w, h 四个数值', 400);
        return;
      }

      const component = await componentService.create(req.params.pageId, {
        componentType,
        name,
        props,
        layout,
        styles,
        interactions,
        parentId,
        sortOrder,
      });
      sendSuccess(res, component, 201);
    } catch (error: any) {
      if (error.message === '页面不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      // 白名单过滤，防止 mass assignment
      const allowedFields = ['name', 'props', 'layout', 'styles', 'interactions', 'states', 'sortOrder', 'isLocked'];
      const filteredData: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          filteredData[key] = req.body[key];
        }
      }
      const component = await componentService.update(req.params.id, filteredData);
      sendSuccess(res, component);
    } catch (error: any) {
      if (error.message === '组件不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await componentService.delete(req.params.id);
      sendSuccess(res, { message: '组件已删除' });
    } catch (error: any) {
      if (error.message === '组件不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async batchCreate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { components } = req.body;

      if (!Array.isArray(components)) {
        sendError(res, 'VALIDATION_ERROR', 'components 必须是数组', 400);
        return;
      }

      const result = await componentService.batchCreate(req.params.pageId, components);
      sendSuccess(res, result, 201);
    } catch (error: any) {
      if (error.message === '页面不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }
}

export const componentController = new ComponentController();
