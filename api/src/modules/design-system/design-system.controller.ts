import { Response } from 'express';
import { designSystemService } from './design-system.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class DesignSystemController {
  /**
   * 获取项目的设计规范
   */
  async getByProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const designSystem = await designSystemService.getByProjectId(projectId);
      sendSuccess(res, designSystem);
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  /**
   * 创建/更新设计规范
   */
  async upsert(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const designSystem = await designSystemService.upsert(projectId, req.userId!, req.body);
      sendSuccess(res, designSystem);
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        sendError(res, 'NOT_FOUND', error.message, 404);
      } else {
        sendError(res, 'INTERNAL_ERROR', error.message, 500);
      }
    }
  }

  /**
   * 获取设计 Token
   */
  async getTokens(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const tokens = await designSystemService.getTokens(projectId);
      sendSuccess(res, tokens);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  /**
   * 更新设计 Token
   */
  async updateTokens(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const tokens = await designSystemService.updateTokens(projectId, req.userId!, req.body.tokens);
      sendSuccess(res, tokens);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  /**
   * 获取预设模板
   */
  async getTemplates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const templates = designSystemService.getTemplates();
      sendSuccess(res, templates);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }

  /**
   * 生成 CSS 变量
   */
  async generateCss(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const css = await designSystemService.generateCssVariables(projectId);
      res.setHeader('Content-Type', 'text/css');
      res.send(css);
    } catch (error: any) {
      sendError(res, 'INTERNAL_ERROR', error.message, 500);
    }
  }
}

export const designSystemController = new DesignSystemController();
