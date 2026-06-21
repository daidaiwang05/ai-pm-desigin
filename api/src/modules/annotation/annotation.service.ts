import { prisma } from '../../utils/prisma';

export interface CreateAnnotationInput {
  componentId: string;
  pageId: string;
  iterationId: string;
  annotationType?: string;
  content: string;
  priority?: number;
  tag?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface UpdateAnnotationInput {
  content?: string;
  status?: string;
  priority?: number;
  tag?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface CreateCommentInput {
  content: string;
  mentions?: Array<{ userId: string; start: number; end: number }>;
}

export class AnnotationService {
  async list(iterationId: string, filters?: {
    pageId?: string;
    componentId?: string;
    status?: string;
    tag?: string;
    annotationType?: string;
  }) {
    const where: any = { iterationId };

    if (filters?.pageId) where.pageId = filters.pageId;
    if (filters?.componentId) where.componentId = filters.componentId;
    if (filters?.status) where.status = filters.status;
    if (filters?.tag) where.tag = filters.tag;
    if (filters?.annotationType) where.annotationType = filters.annotationType;

    return prisma.annotation.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        comments: {
          where: { isDeleted: false },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, input: CreateAnnotationInput) {
    // Verify component exists
    const component = await prisma.component.findUnique({
      where: { id: input.componentId },
    });

    if (!component) {
      throw new Error('组件不存在');
    }

    // Determine color based on tag
    const tagColors: Record<string, string> = {
      'R1': '#ef4444',  // 红色 - 必须项
      'R2': '#f97316',  // 橙色 - 期望项
      'R3': '#6b7280',  // 灰色 - 参考项
    };

    return prisma.annotation.create({
      data: {
        componentId: input.componentId,
        pageId: input.pageId,
        iterationId: input.iterationId,
        annotationType: input.annotationType || 'requirement',
        content: input.content,
        priority: input.priority || 1,
        tag: input.tag,
        color: input.tag ? tagColors[input.tag] || '#3B82F6' : '#3B82F6',
        createdBy: userId,
        assignedTo: input.assignedTo,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async update(annotationId: string, userId: string, input: UpdateAnnotationInput) {
    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new Error('标注不存在');
    }

    const updateData: any = { ...input };

    // Handle status change
    if (input.status && input.status !== annotation.status) {
      if (input.status === 'resolved' || input.status === 'accepted') {
        updateData.resolvedBy = userId;
        updateData.resolvedAt = new Date();
      } else if (input.status === 'open') {
        updateData.resolvedBy = null;
        updateData.resolvedAt = null;
      }
    }

    // Update color if tag changes
    if (input.tag) {
      const tagColors: Record<string, string> = {
        'R1': '#ef4444',
        'R2': '#f97316',
        'R3': '#6b7280',
      };
      updateData.color = tagColors[input.tag] || '#3B82F6';
    }

    return prisma.annotation.update({
      where: { id: annotationId },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async delete(annotationId: string) {
    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new Error('标注不存在');
    }

    await prisma.annotation.delete({
      where: { id: annotationId },
    });
  }

  async addComment(annotationId: string, userId: string, input: CreateCommentInput) {
    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new Error('标注不存在');
    }

    return prisma.annotationComment.create({
      data: {
        annotationId,
        userId,
        content: input.content,
        mentions: input.mentions || [],
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.annotationComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('评论不存在');
    }

    // Only allow deleting own comments
    if (comment.userId !== userId) {
      throw new Error('只能删除自己的评论');
    }

    await prisma.annotationComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
  }

  async getStats(iterationId: string) {
    const [total, open, resolved, accepted, rejected] = await Promise.all([
      prisma.annotation.count({ where: { iterationId } }),
      prisma.annotation.count({ where: { iterationId, status: 'open' } }),
      prisma.annotation.count({ where: { iterationId, status: 'resolved' } }),
      prisma.annotation.count({ where: { iterationId, status: 'accepted' } }),
      prisma.annotation.count({ where: { iterationId, status: 'rejected' } }),
    ]);

    const byTag = await prisma.annotation.groupBy({
      by: ['tag'],
      where: { iterationId },
      _count: true,
    });

    return {
      total,
      open,
      resolved,
      accepted,
      rejected,
      byTag: byTag.reduce((acc, item) => {
        if (item.tag) {
          acc[item.tag] = item._count;
        }
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const annotationService = new AnnotationService();
