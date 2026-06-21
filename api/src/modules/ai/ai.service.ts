import { config } from '../../config';

export interface GenerateRequest {
  prompt: string;
  device_type?: string;
  viewport_w?: number;
  viewport_h?: number;
  existing_components?: string[];
  page_count?: number;
}

export interface RefineRequest {
  page: any;
  instruction: string;
  device_type?: string;
}

export interface AddComponentRequest {
  page: any;
  component_type: string;
  description: string;
  device_type?: string;
}

export interface PRDGenerateRequest {
  product_name: string;
  description: string;
  target_users?: string;
  core_features?: string[];
  industry?: string;
}

export class AIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.ai.engineUrl;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error('AI 引擎不可用');
    }
    return response.json();
  }

  /**
   * AI 生成原型（非流式）
   */
  async generate(request: GenerateRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'AI 生成失败');
    }

    return response.json();
  }

  /**
   * AI 生成原型（流式 SSE）
   * 返回 ReadableStream 供前端消费
   */
  async generateStream(request: GenerateRequest): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/ai/generate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'AI 流式生成失败');
    }

    // 返回响应体作为 ReadableStream
    return response.body!;
  }

  /**
   * AI 优化原型
   */
  async refine(request: RefineRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ai/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'AI 优化失败');
    }

    return response.json();
  }

  /**
   * AI 添加组件
   */
  async addComponent(request: AddComponentRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ai/add-component`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'AI 添加组件失败');
    }

    return response.json();
  }

  /**
   * AI 生成 PRD
   */
  async generatePRD(request: PRDGenerateRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ai/generate-prd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'PRD 生成失败');
    }

    return response.json();
  }

  /**
   * 获取组件库
   */
  async getComponents(category?: string): Promise<any[]> {
    const url = category
      ? `${this.baseUrl}/ai/components/${category}`
      : `${this.baseUrl}/ai/components`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('获取组件库失败');
    }

    return response.json();
  }

  /**
   * 获取组件默认属性
   */
  async getComponentProps(componentType: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ai/component-props/${componentType}`);

    if (!response.ok) {
      throw new Error('获取组件属性失败');
    }

    return response.json();
  }
}

export const aiService = new AIService();
