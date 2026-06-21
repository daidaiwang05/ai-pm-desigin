import { Request, Response } from 'express';
import { aiService } from './ai.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class AIController {
  // 辅助方法：检查用户是否已认证
  private ensureAuthenticated(req: AuthRequest, res: Response): string | null {
    if (!req.userId) {
      sendError(res, 'UNAUTHORIZED', '未提供认证令牌', 401);
      return null;
    }
    return req.userId;
  }

  /**
   * 健康检查
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await aiService.healthCheck();
      sendSuccess(res, health);
    } catch (error: any) {
      sendError(res, 'SERVICE_UNAVAILABLE', 'AI 引擎不可用', 503);
    }
  }

  /**
   * AI 生成原型（非流式）
   */
  async generate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const { prompt, device_type, viewport_w, viewport_h, existing_components, page_count } = req.body;

      if (!prompt) {
        sendError(res, 'VALIDATION_ERROR', '请输入生成描述', 400);
        return;
      }

      const result = await aiService.generate({
        prompt,
        device_type,
        viewport_w,
        viewport_h,
        existing_components,
        page_count,
      });

      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'GENERATION_FAILED', error.message, 500);
    }
  }

  /**
   * AI 生成原型（流式 SSE）
   */
  async generateStream(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const { prompt, device_type, viewport_w, viewport_h, existing_components, page_count } = req.body;

      if (!prompt) {
        sendError(res, 'VALIDATION_ERROR', '请输入生成描述', 400);
        return;
      }

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const stream = await aiService.generateStream({
        prompt,
        device_type,
        viewport_w,
        viewport_h,
        existing_components,
        page_count,
      });

      // 将 AI 引擎的流式响应转发给前端
      const reader = stream.getReader();

      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(value);
        }
      };

      pump().catch((err) => {
        console.error('Stream error:', err);
        res.end();
      });

      // 处理客户端断开连接
      req.on('close', () => {
        reader.cancel();
      });
    } catch (error: any) {
      sendError(res, 'GENERATION_FAILED', error.message, 500);
    }
  }

  /**
   * AI 优化原型
   */
  async refine(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const { page, instruction, device_type } = req.body;

      if (!page || !instruction) {
        sendError(res, 'VALIDATION_ERROR', '请提供页面数据和优化指令', 400);
        return;
      }

      const result = await aiService.refine({
        page,
        instruction,
        device_type,
      });

      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'REFINE_FAILED', error.message, 500);
    }
  }

  /**
   * AI 添加组件
   */
  async addComponent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const { page, component_type, description, device_type } = req.body;

      if (!page || !component_type || !description) {
        sendError(res, 'VALIDATION_ERROR', '请提供页面数据、组件类型和描述', 400);
        return;
      }

      const result = await aiService.addComponent({
        page,
        component_type,
        description,
        device_type,
      });

      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'ADD_COMPONENT_FAILED', error.message, 500);
    }
  }

  /**
   * AI 生成 PRD
   */
  async generatePRD(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const { product_name, description, target_users, core_features, industry } = req.body;

      if (!product_name || !description) {
        sendError(res, 'VALIDATION_ERROR', '请提供产品名称和描述', 400);
        return;
      }

      const result = await aiService.generatePRD({
        product_name,
        description,
        target_users,
        core_features,
        industry,
      });

      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'PRD_GENERATION_FAILED', error.message, 500);
    }
  }

  /**
   * 获取组件库
   */
  async getComponents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const { category } = req.query;
      const components = await aiService.getComponents(category as string | undefined);
      sendSuccess(res, components);
    } catch (error: any) {
      sendError(res, 'FETCH_FAILED', error.message, 500);
    }
  }

  /**
   * 获取组件默认属性
   */
  async getComponentProps(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.ensureAuthenticated(req, res);
      if (!userId) return;

      const { type } = req.params;
      const props = await aiService.getComponentProps(type);
      sendSuccess(res, props);
    } catch (error: any) {
      sendError(res, 'FETCH_FAILED', error.message, 500);
    }
  }
}

export const aiController = new AIController();
