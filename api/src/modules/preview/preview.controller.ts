import { Request, Response } from 'express';
import { previewService } from './preview.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class PreviewController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { iterationId, name, password, expiresIn } = req.body;

      if (!iterationId) {
        sendError(res, 'VALIDATION_ERROR', 'iterationId 为必填项', 400);
        return;
      }

      const link = await previewService.createPreviewLink(req.userId!, {
        iterationId,
        name,
        password,
        expiresIn,
      });
      sendSuccess(res, link, 201);
    } catch (error: any) {
      if (error.message === '迭代版本不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { iterationId } = req.params;
      const links = await previewService.listPreviewLinks(iterationId);
      sendSuccess(res, links);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  async access(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const result = await previewService.validatePreviewLink(token, password);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === '预览链接不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message === '预览链接已失效' || error.message === '预览链接已过期') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else if (error.message === '密码错误') {
        sendError(res, 'UNAUTHORIZED', error.message, 401);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await previewService.deletePreviewLink(req.params.id, req.userId!);
      sendSuccess(res, { message: '预览链接已删除' });
    } catch (error: any) {
      if (error.message === '预览链接不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message === '无权删除此预览链接') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async toggle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { isActive } = req.body;
      const link = await previewService.togglePreviewLink(req.params.id, isActive, req.userId!);
      sendSuccess(res, link);
    } catch (error: any) {
      if (error.message === '预览链接不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message === '无权修改此预览链接') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async addComment(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const { componentId, content, phone } = req.body;

      if (!componentId || !content) {
        sendError(res, 'VALIDATION_ERROR', 'componentId 和 content 为必填项', 400);
        return;
      }

      const comment = await previewService.addPreviewComment(token, {
        componentId,
        content,
        phone,
        userName: phone ? `用户${phone.slice(-4)}` : '匿名用户',
      });
      sendSuccess(res, comment, 201);
    } catch (error: any) {
      if (error.message === '预览链接不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async listComments(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const { componentId } = req.query;

      const comments = await previewService.listPreviewComments(
        token,
        componentId as string
      );
      sendSuccess(res, comments);
    } catch (error: any) {
      if (error.message === '预览链接不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }
}

export const previewController = new PreviewController();
