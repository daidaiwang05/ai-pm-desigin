import { prisma } from '../../utils/prisma';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

export interface CreatePreviewLinkInput {
  iterationId: string;
  name?: string;
  password?: string;
  expiresIn?: number; // 小时数
}

export class PreviewService {
  /**
   * 创建预览链接
   */
  async createPreviewLink(userId: string, input: CreatePreviewLinkInput) {
    // 验证迭代存在
    const iteration = await prisma.iteration.findUnique({
      where: { id: input.iterationId },
    });

    if (!iteration) {
      throw new Error('迭代版本不存在');
    }

    // 生成安全 Token
    const token = this.generateSecureToken();

    // 处理密码
    let passwordHash: string | null = null;
    if (input.password) {
      passwordHash = await bcrypt.hash(input.password, 10);
    }

    // 计算过期时间
    let expiresAt: Date | null = null;
    if (input.expiresIn) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + input.expiresIn);
    }

    const previewLink = await prisma.previewLink.create({
      data: {
        iterationId: input.iterationId,
        token,
        name: input.name || `预览链接 ${new Date().toLocaleString('zh-CN')}`,
        password: passwordHash,
        expiresAt,
        createdBy: userId,
      },
    });

    return {
      id: previewLink.id,
      token: previewLink.token,
      name: previewLink.name,
      url: `/preview/${previewLink.token}`,
      hasPassword: !!passwordHash,
      expiresAt: previewLink.expiresAt,
      createdAt: previewLink.createdAt,
    };
  }

  /**
   * 获取迭代的预览链接列表
   */
  async listPreviewLinks(iterationId: string) {
    return prisma.previewLink.findMany({
      where: { iterationId },
      select: {
        id: true,
        token: true,
        name: true,
        viewCount: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        lastAccessedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 验证预览链接
   */
  async validatePreviewLink(token: string, password?: string) {
    const previewLink = await prisma.previewLink.findUnique({
      where: { token },
      include: {
        iteration: {
          include: {
            pages: {
              where: { deletedAt: null },
              include: {
                components: {
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    annotations: {
                      where: { status: { not: 'rejected' } },
                      orderBy: { createdAt: 'desc' },
                    },
                  },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!previewLink) {
      throw new Error('预览链接不存在');
    }

    if (!previewLink.isActive) {
      throw new Error('预览链接已失效');
    }

    if (previewLink.expiresAt && previewLink.expiresAt < new Date()) {
      throw new Error('预览链接已过期');
    }

    // 验证密码
    if (previewLink.password) {
      if (!password) {
        return {
          requiresPassword: true,
          token: previewLink.token,
        };
      }

      const isValid = await bcrypt.compare(password, previewLink.password);
      if (!isValid) {
        throw new Error('密码错误');
      }
    }

    // 更新访问统计
    await prisma.previewLink.update({
      where: { id: previewLink.id },
      data: {
        viewCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    return {
      requiresPassword: false,
      previewLinkId: previewLink.id,
      iteration: {
        id: previewLink.iteration.id,
        name: previewLink.iteration.name,
        version: previewLink.iteration.version,
        pages: previewLink.iteration.pages,
      },
    };
  }

  /**
   * 删除预览链接
   */
  async deletePreviewLink(linkId: string, userId: string) {
    const link = await prisma.previewLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new Error('预览链接不存在');
    }

    // 验证所有权
    if (link.createdBy !== userId) {
      throw new Error('无权删除此预览链接');
    }

    await prisma.previewLink.delete({
      where: { id: linkId },
    });
  }

  /**
   * 切换预览链接状态
   */
  async togglePreviewLink(linkId: string, isActive: boolean, userId: string) {
    const link = await prisma.previewLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new Error('预览链接不存在');
    }

    // 验证所有权
    if (link.createdBy !== userId) {
      throw new Error('无权修改此预览链接');
    }

    return prisma.previewLink.update({
      where: { id: linkId },
      data: { isActive },
    });
  }

  /**
   * 添加预览评论
   */
  async addPreviewComment(token: string, input: {
    componentId: string;
    content: string;
    phone?: string;
    userName?: string;
  }) {
    const previewLink = await prisma.previewLink.findUnique({
      where: { token },
      include: { iteration: { select: { id: true } } },
    });

    if (!previewLink) {
      throw new Error('预览链接不存在');
    }

    // 查找组件获取 pageId
    const component = await prisma.component.findUnique({
      where: { id: input.componentId },
      select: { pageId: true },
    });

    if (!component) {
      throw new Error('组件不存在');
    }

    // 创建标注作为评论
    const annotation = await prisma.annotation.create({
      data: {
        componentId: input.componentId,
        pageId: component.pageId,
        iterationId: previewLink.iteration.id,
        annotationType: 'note',
        content: input.content,
        status: 'open',
        priority: 1,
        createdBy: previewLink.createdBy, // 使用预览链接创建者作为默认
        tag: null,
      },
    });

    // 添加评论
    const comment = await prisma.annotationComment.create({
      data: {
        annotationId: annotation.id,
        userId: previewLink.createdBy,
        content: `${input.userName || '匿名用户'}: ${input.content}`,
        mentions: [],
        attachments: [],
      },
    });

    return {
      id: comment.id,
      annotationId: annotation.id,
      content: comment.content,
      userName: input.userName || '匿名用户',
      createdAt: comment.createdAt,
    };
  }

  /**
   * 获取预览评论
   */
  async listPreviewComments(token: string, componentId?: string) {
    const previewLink = await prisma.previewLink.findUnique({
      where: { token },
      include: { iteration: { select: { id: true } } },
    });

    if (!previewLink) {
      throw new Error('预览链接不存在');
    }

    const where: any = {
      iterationId: previewLink.iteration.id,
      annotationType: 'note',
    };

    if (componentId) {
      where.componentId = componentId;
    }

    const annotations = await prisma.annotation.findMany({
      where,
      include: {
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return annotations.flatMap((anno) =>
      anno.comments.map((comment) => ({
        id: comment.id,
        annotationId: anno.id,
        componentId: anno.componentId,
        content: comment.content,
        userName: comment.content.split(':')[0] || '匿名用户',
        createdAt: comment.createdAt,
      }))
    );
  }

  /**
   * 生成安全 Token
   */
  private generateSecureToken(): string {
    return randomBytes(32).toString('hex').substring(0, 48);
  }
}

export const previewService = new PreviewService();
