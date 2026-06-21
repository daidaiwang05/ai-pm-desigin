import { Response } from 'express';
import { projectService } from './project.service';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class ProjectController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      // 限制 pageSize 最大为 100，防止资源耗尽
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

      const { projects, total } = await projectService.list(req.userId!, page, pageSize);
      sendPaginated(res, projects, total, page, pageSize);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description, orgId } = req.body;

      if (!name) {
        sendError(res, 'VALIDATION_ERROR', '项目名称为必填项', 400);
        return;
      }

      const project = await projectService.create(req.userId!, { name, description, orgId });
      sendSuccess(res, project, 201);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const project = await projectService.getById(req.params.id, req.userId!);
      sendSuccess(res, project);
    } catch (error: any) {
      if (error.message === '项目不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      // 白名单过滤，防止 mass assignment
      const allowedFields = ['name', 'description', 'isPublic', 'settings', 'metadata', 'thumbnailUrl'];
      const filteredData: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          filteredData[key] = req.body[key];
        }
      }
      const project = await projectService.update(req.params.id, req.userId!, filteredData);
      sendSuccess(res, project);
    } catch (error: any) {
      if (error.message === '项目不存在或无权限修改') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await projectService.delete(req.params.id, req.userId!);
      sendSuccess(res, { message: '项目已删除' });
    } catch (error: any) {
      if (error.message === '项目不存在或无权限删除') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }
}

export const projectController = new ProjectController();
