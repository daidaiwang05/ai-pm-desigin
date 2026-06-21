import { prisma } from '../../utils/prisma';

export interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'font' | 'spacing' | 'borderRadius' | 'shadow' | 'other';
  description?: string;
}

export interface DesignSystemInput {
  name: string;
  description?: string;
  tokens: DesignToken[];
  logoUrl?: string;
  brandColors?: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
}

export class DesignSystemService {
  /**
   * 获取项目的设计规范
   */
  async getByProjectId(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { settings: true },
    });

    if (!project) {
      throw new Error('项目不存在');
    }

    const settings = project.settings as any;
    return settings.designSystem || null;
  }

  /**
   * 创建/更新设计规范
   */
  async upsert(projectId: string, userId: string, input: DesignSystemInput) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { settings: true },
    });

    if (!project) {
      throw new Error('项目不存在');
    }

    const settings = (project.settings as any) || {};
    settings.designSystem = {
      ...input,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await prisma.project.update({
      where: { id: projectId },
      data: { settings },
    });

    return settings.designSystem;
  }

  /**
   * 获取设计 Token
   */
  async getTokens(projectId: string) {
    const designSystem = await this.getByProjectId(projectId);
    return designSystem?.tokens || [];
  }

  /**
   * 更新设计 Token
   */
  async updateTokens(projectId: string, userId: string, tokens: DesignToken[]) {
    const designSystem = await this.getByProjectId(projectId) || {};
    designSystem.tokens = tokens;
    designSystem.updatedAt = new Date().toISOString();
    designSystem.updatedBy = userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { settings: true },
    });

    const settings = (project?.settings as any) || {};
    settings.designSystem = designSystem;

    await prisma.project.update({
      where: { id: projectId },
      data: { settings },
    });

    return tokens;
  }

  /**
   * 获取预设的设计规范模板
   */
  getTemplates() {
    return [
      {
        name: 'Material Design',
        description: 'Google Material Design 风格',
        tokens: [
          { name: 'primary', value: '#1976d2', type: 'color' as const, description: '主色调' },
          { name: 'secondary', value: '#dc004e', type: 'color' as const, description: '次要色' },
          { name: 'background', value: '#fafafa', type: 'color' as const, description: '背景色' },
          { name: 'surface', value: '#ffffff', type: 'color' as const, description: '表面色' },
          { name: 'error', value: '#d32f2f', type: 'color' as const, description: '错误色' },
          { name: 'fontFamily', value: 'Roboto, sans-serif', type: 'font' as const, description: '字体' },
          { name: 'fontSizeBase', value: '14px', type: 'font' as const, description: '基础字号' },
          { name: 'spacingUnit', value: '8px', type: 'spacing' as const, description: '间距单位' },
          { name: 'borderRadius', value: '4px', type: 'borderRadius' as const, description: '圆角' },
        ],
      },
      {
        name: 'Ant Design',
        description: '蚂蚁金服 Ant Design 风格',
        tokens: [
          { name: 'primary', value: '#1890ff', type: 'color' as const, description: '主色调' },
          { name: 'success', value: '#52c41a', type: 'color' as const, description: '成功色' },
          { name: 'warning', value: '#faad14', type: 'color' as const, description: '警告色' },
          { name: 'error', value: '#f5222d', type: 'color' as const, description: '错误色' },
          { name: 'textPrimary', value: '#262626', type: 'color' as const, description: '主文本色' },
          { name: 'textSecondary', value: '#8c8c8c', type: 'color' as const, description: '次要文本色' },
          { name: 'border', value: '#d9d9d9', type: 'color' as const, description: '边框色' },
          { name: 'fontFamily', value: '-apple-system, BlinkMacSystemFont, sans-serif', type: 'font' as const, description: '字体' },
          { name: 'fontSizeBase', value: '14px', type: 'font' as const, description: '基础字号' },
          { name: 'borderRadius', value: '2px', type: 'borderRadius' as const, description: '圆角' },
        ],
      },
      {
        name: 'iOS Human Interface',
        description: 'Apple iOS 风格',
        tokens: [
          { name: 'primary', value: '#007AFF', type: 'color' as const, description: '主色调' },
          { name: 'secondary', value: '#5856D6', type: 'color' as const, description: '次要色' },
          { name: 'success', value: '#34C759', type: 'color' as const, description: '成功色' },
          { name: 'warning', value: '#FF9500', type: 'color' as const, description: '警告色' },
          { name: 'error', value: '#FF3B30', type: 'color' as const, description: '错误色' },
          { name: 'background', value: '#F2F2F7', type: 'color' as const, description: '背景色' },
          { name: 'fontFamily', value: '-apple-system, SF Pro Text, sans-serif', type: 'font' as const, description: '字体' },
          { name: 'fontSizeBase', value: '17px', type: 'font' as const, description: '基础字号' },
          { name: 'borderRadius', value: '10px', type: 'borderRadius' as const, description: '圆角' },
        ],
      },
    ];
  }

  /**
   * 生成 CSS 变量
   */
  generateCssVariables(projectId: string): Promise<string> {
    return this.getTokens(projectId).then((tokens) => {
      let css = ':root {\n';
      for (const token of tokens) {
        const varName = `--ds-${token.name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        css += `  ${varName}: ${token.value};\n`;
      }
      css += '}\n';
      return css;
    });
  }
}

export const designSystemService = new DesignSystemService();
