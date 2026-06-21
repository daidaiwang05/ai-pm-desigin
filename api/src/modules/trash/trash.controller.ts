import { Response } from 'express';
import { trashService } from './trash.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class TrashController {
  /**
   * 获取已删除的项目
   */
  async getDeletedProjects(req: AuthRequest, res: Response): Promise<void> {
    try {
      const projects = await trashService.getDeletedProjects(req.userId!);
      sendSuccess(res, projects);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  /**
   * 获取已删除的页面
   */
  async getDeletedPages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pages = await trashService.getDeletedPages(req.params.projectId);
      sendSuccess(res, pages);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  /**
   * 恢复项目
   */
  async restoreProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const project = await trashService.restoreProject(req.params.id, req.userId!);
      sendSuccess(res, project);
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message.includes('无权')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  /**
   * 恢复页面
   */
  async restorePage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = await trashService.restorePage(req.params.id, req.userId!);
      sendSuccess(res, page);
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message.includes('无权')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  /**
   * 永久删除项目
   */
  async permanentDeleteProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      await trashService.permanentDeleteProject(req.params.id, req.userId!);
      sendSuccess(res, { message: '项目已永久删除' });
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message.includes('无权')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  /**
   * 永久删除页面
   */
  async permanentDeletePage(req: AuthRequest, res: Response): Promise<void> {
    try {
      await trashService.permanentDeletePage(req.params.id, req.userId!);
      sendSuccess(res, { message: '页面已永久删除' });
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message.includes('无权')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  /**
   * 清空回收站
   */
  async cleanup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await trashService.autoCleanup();
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }
}

export const trashController = new TrashController();
