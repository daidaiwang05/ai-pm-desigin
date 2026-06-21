import type {
  User,
  Project,
  Iteration,
  Page,
  Component,
  Annotation,
  ApiResponse,
} from '@/types/schema';

const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1');

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // 每次从 localStorage 读取最新的 token，避免缓存过期
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  setToken(token: string | null) {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // 每次请求时获取最新的 token
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // 处理 401 错误 - 清除登录状态
      if (response.status === 401) {
        this.setToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        throw new Error('登录已过期，请重新登录');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `请求失败 (${response.status})`);
      }

      return data;
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[API] Error:', error.message);
      }
      throw error;
    }
  }

  // ============================================
  // Auth
  // ============================================

  async register(email: string, password: string, name: string) {
    const result = await this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // ============================================
  // Projects
  // ============================================

  async getProjects(page = 1, pageSize = 20) {
    return this.request<Project[]>(`/projects?page=${page}&pageSize=${pageSize}`);
  }

  async createProject(name: string, description?: string) {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getProject(id: string) {
    return this.request<Project & { currentIteration?: Iteration }>(`/projects/${id}`);
  }

  async updateProject(id: string, data: Partial<Project>) {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Iterations
  // ============================================

  async getIterations(projectId: string) {
    return this.request<Iteration[]>(`/projects/${projectId}/iterations`);
  }

  async createIteration(projectId: string, name: string, version: string, description?: string, basedOnId?: string) {
    return this.request<Iteration>(`/projects/${projectId}/iterations`, {
      method: 'POST',
      body: JSON.stringify({ name, version, description, basedOnId }),
    });
  }

  async getIteration(id: string) {
    return this.request<Iteration & { pages: Page[] }>(`/iterations/${id}`);
  }

  // ============================================
  // Pages
  // ============================================

  async getPages(iterationId: string) {
    return this.request<Page[]>(`/iterations/${iterationId}/pages`);
  }

  async createPage(iterationId: string, name: string, deviceType?: string) {
    return this.request<Page>(`/iterations/${iterationId}/pages`, {
      method: 'POST',
      body: JSON.stringify({ name, deviceType }),
    });
  }

  async getPage(id: string) {
    return this.request<Page & { components: Component[] }>(`/pages/${id}`);
  }

  async updatePage(id: string, data: Partial<Page>) {
    return this.request<Page>(`/pages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePage(id: string) {
    return this.request<void>(`/pages/${id}`, {
      method: 'DELETE',
    });
  }

  async duplicatePage(id: string) {
    return this.request<Page>(`/pages/${id}/duplicate`, {
      method: 'POST',
    });
  }

  async reorderPage(id: string, sortOrder: number) {
    return this.request<Page>(`/pages/${id}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ sortOrder }),
    });
  }

  // ============================================
  // Components
  // ============================================

  async getComponents(pageId: string) {
    return this.request<Component[]>(`/pages/${pageId}/components`);
  }

  async createComponent(pageId: string, component: Partial<Component>) {
    return this.request<Component>(`/pages/${pageId}/components`, {
      method: 'POST',
      body: JSON.stringify(component),
    });
  }

  async updateComponent(id: string, data: Partial<Component>) {
    return this.request<Component>(`/components/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteComponent(id: string) {
    return this.request<void>(`/components/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Annotations
  // ============================================

  async getAnnotations(iterationId: string, componentId?: string) {
    const query = componentId ? `?componentId=${componentId}` : '';
    return this.request<Annotation[]>(`/iterations/${iterationId}/annotations${query}`);
  }

  async createAnnotation(data: Partial<Annotation>) {
    return this.request<Annotation>('/annotations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAnnotation(id: string, data: Partial<Annotation>) {
    return this.request<Annotation>(`/annotations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAnnotation(id: string) {
    return this.request<void>(`/annotations/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // AI Generation
  // ============================================

  async aiHealthCheck() {
    return this.request<any>('/ai/health');
  }

  async aiGenerate(prompt: string, options?: {
    device_type?: string;
    viewport_w?: number;
    viewport_h?: number;
    page_count?: number;
  }) {
    return this.request<any>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, ...options }),
    });
  }

  async aiRefine(page: any, instruction: string, device_type?: string) {
    return this.request<any>('/ai/refine', {
      method: 'POST',
      body: JSON.stringify({ page, instruction, device_type }),
    });
  }

  async aiAddComponent(page: any, component_type: string, description: string, device_type?: string) {
    return this.request<any>('/ai/add-component', {
      method: 'POST',
      body: JSON.stringify({ page, component_type, description, device_type }),
    });
  }

  async aiGeneratePRD(product_name: string, description: string, options?: {
    target_users?: string;
    core_features?: string[];
    industry?: string;
  }) {
    return this.request<any>('/ai/generate-prd', {
      method: 'POST',
      body: JSON.stringify({ product_name, description, ...options }),
    });
  }

  async aiGetComponents(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request<any[]>(`/ai/components${query}`);
  }

  async aiGetComponentProps(type: string) {
    return this.request<any>(`/ai/component-props/${type}`);
  }

  /**
   * AI 流式生成（SSE）
   * 返回 EventSource 用于接收流式数据
   */
  aiGenerateStream(prompt: string, options?: {
    device_type?: string;
    viewport_w?: number;
    viewport_h?: number;
    page_count?: number;
  }): EventSource {
    const token = this.getToken();
    const url = new URL(`${this.baseUrl}/ai/generate/stream`);

    // 使用 POST + fetch 实现 SSE（因为需要发送 body）
    // 这里返回一个自定义的 EventSource-like 对象
    const eventSource = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      close: () => {},
    };

    // 使用 fetch 发送 POST 请求并处理 SSE 流
    fetch(`${this.baseUrl}/ai/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt, ...options }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Stream request failed');
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (eventSource.onmessage) {
                  eventSource.onmessage(new MessageEvent('message', { data }));
                }
              }
            }
          }
        };

        processStream().catch(err => {
          if (eventSource.onerror) {
            eventSource.onerror(new Event('error'));
          }
        });

        eventSource.close = () => {
          reader.cancel();
        };
      })
      .catch(err => {
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'));
        }
      });

    return eventSource as unknown as EventSource;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
