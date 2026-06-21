import { Response } from 'express';
import { exportService } from './export.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class ExportController {
  async exportMarkdown(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { iterationId } = req.params;
      const result = await exportService.exportToMarkdown(iterationId);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
      res.send(result.content);
    } catch (error: any) {
      if (error.message === '迭代版本不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async exportJson(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { iterationId } = req.params;
      const result = await exportService.exportToJson(iterationId);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
      res.send(result.content);
    } catch (error: any) {
      if (error.message === '迭代版本不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  async exportAnnotations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { iterationId } = req.params;
      const format = (req.query.format as 'markdown' | 'json') || 'markdown';
      const result = await exportService.exportAnnotations(iterationId, format);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
      res.send(result.content);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  async exportHtml(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { iterationId } = req.params;
      const result = await exportService.exportToHtml(iterationId);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
      res.send(result.content);
    } catch (error: any) {
      if (error.message === '迭代版本不存在') {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }
}

export const exportController = new ExportController();
