import { Response } from 'express';
import { annotationService } from './annotation.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class AnnotationController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { iid } = req.params;
      const { pageId, componentId, status, tag, annotationType } = req.query;

      const annotations = await annotationService.list(iid, {
        pageId: pageId as string,
        componentId: componentId as string,
        status: status as string,
        tag: tag as string,
        annotationType: annotationType as string,
      });
      sendSuccess(res, annotations);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { componentId, pageId, iterationId, annotationType, content, priority, tag, assignedTo, dueDate } = req.body;

      if (!componentId || !pageId || !iterationId || !content) {
        sendError(res, 'VALIDATION_ERROR', '缺少必填字段', 400);
        return;
      }

      const annotation = await annotationService.create(req.userId!, {
        componentId,
        pageId,
        iterationId,
        annotationType,
        content,
        priority,
        tag,
        assignedTo,
        dueDate,
      });
      sendSuccess(res, annotation, 201);
    } catch (error: any) {
      if (error.message === '组件不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const annotation = await annotationService.update(req.params.id, req.userId!, req.body);
      sendSuccess(res, annotation);
    } catch (error: any) {
      if (error.message === '标注不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await annotationService.delete(req.params.id);
      sendSuccess(res, { message: '标注已删除' });
    } catch (error: any) {
      if (error.message === '标注不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async addComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { content, mentions } = req.body;

      if (!content) {
        sendError(res, 'VALIDATION_ERROR', '评论内容不能为空', 400);
        return;
      }

      const comment = await annotationService.addComment(req.params.id, req.userId!, {
        content,
        mentions,
      });
      sendSuccess(res, comment, 201);
    } catch (error: any) {
      if (error.message === '标注不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async deleteComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      await annotationService.deleteComment(req.params.commentId, req.userId!);
      sendSuccess(res, { message: '评论已删除' });
    } catch (error: any) {
      if (error.message === '评论不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else if (error.message === '只能删除自己的评论') {
        sendError(res, 'FORBIDDEN', error.message, 403);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await annotationService.getStats(req.params.iid);
      sendSuccess(res, stats);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }
}

export const annotationController = new AnnotationController();
