import { prisma } from '../../utils/prisma';

export class TrashService {
  /**
   * 获取已删除的项目列表
   */
  async getDeletedProjects(userId: string) {
    return prisma.project.findMany({
      where: {
        ownerId: userId,
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: 'desc' },
      include: {
        organization: { select: { name: true } },
        _count: { select: { iterations: true } },
      },
    });
  }

  /**
   * 获取已删除的页面列表
   */
  async getDeletedPages(projectId: string) {
    return prisma.page.findMany({
      where: {
        iteration: { projectId },
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: 'desc' },
      include: {
        iteration: { select: { name: true, version: true } },
        _count: { select: { components: true } },
      },
    });
  }

  /**
   * 恢复项目
   */
  async restoreProject(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !project.deletedAt) {
      throw new Error('项目不存在或未被删除');
    }

    // 验证所有权
    if (project.ownerId !== userId) {
      throw new Error('无权恢复此项目');
    }

    return prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: null },
    });
  }

  /**
   * 恢复页面
   */
  async restorePage(pageId: string, userId: string) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      include: { iteration: { include: { project: { select: { ownerId: true } } } } },
    });

    if (!page || !page.deletedAt) {
      throw new Error('页面不存在或未被删除');
    }

    // 验证所有权
    if (page.iteration.project.ownerId !== userId) {
      throw new Error('无权恢复此页面');
    }

    return prisma.page.update({
      where: { id: pageId },
      data: { deletedAt: null },
    });
  }

  /**
   * 永久删除项目
   */
  async permanentDeleteProject(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !project.deletedAt) {
      throw new Error('项目不存在或未被删除');
    }

    // 验证所有权
    if (project.ownerId !== userId) {
      throw new Error('无权删除此项目');
    }

    // 级联删除所有关联数据
    await prisma.$transaction([
      // 删除标注评论
      prisma.annotationComment.deleteMany({
        where: { annotation: { page: { iteration: { projectId } } } },
      }),
      // 删除标注
      prisma.annotation.deleteMany({
        where: { page: { iteration: { projectId } } },
      }),
      // 删除组件
      prisma.component.deleteMany({
        where: { page: { iteration: { projectId } } },
      }),
      // 删除页面
      prisma.page.deleteMany({
        where: { iteration: { projectId } },
      }),
      // 删除快照
      prisma.snapshot.deleteMany({
        where: { iteration: { projectId } },
      }),
      // 删除预览链接
      prisma.previewLink.deleteMany({
        where: { iteration: { projectId } },
      }),
      // 删除迭代
      prisma.iteration.deleteMany({
        where: { projectId },
      }),
      // 删除成员
      prisma.projectMember.deleteMany({
        where: { projectId },
      }),
      // 删除活动记录
      prisma.activity.deleteMany({
        where: { projectId },
      }),
      // 删除项目
      prisma.project.delete({ where: { id: projectId } }),
    ]);

    return { success: true };
  }

  /**
   * 永久删除页面
   */
  async permanentDeletePage(pageId: string, userId: string) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      include: { iteration: { include: { project: { select: { ownerId: true } } } } },
    });

    if (!page || !page.deletedAt) {
      throw new Error('页面不存在或未被删除');
    }

    // 验证所有权
    if (page.iteration.project.ownerId !== userId) {
      throw new Error('无权删除此页面');
    }

    await prisma.$transaction([
      prisma.annotationComment.deleteMany({
        where: { annotation: { pageId } },
      }),
      prisma.annotation.deleteMany({ where: { pageId } }),
      prisma.component.deleteMany({ where: { pageId } }),
      prisma.page.delete({ where: { id: pageId } }),
    ]);

    return { success: true };
  }

  /**
   * 清空回收站（超过30天的数据）
   */
  async autoCleanup() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 删除超过30天的项目
    const expiredProjects = await prisma.project.findMany({
      where: {
        deletedAt: { not: null, lt: thirtyDaysAgo },
      },
      select: { id: true },
    });

    for (const project of expiredProjects) {
      await this.permanentDeleteProject(project.id);
    }

    // 删除超过30天的页面
    const expiredPages = await prisma.page.findMany({
      where: {
        deletedAt: { not: null, lt: thirtyDaysAgo },
      },
      select: { id: true },
    });

    for (const page of expiredPages) {
      await this.permanentDeletePage(page.id);
    }

    return {
      deletedProjects: expiredProjects.length,
      deletedPages: expiredPages.length,
    };
  }
}

export const trashService = new TrashService();
