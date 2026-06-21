import { prisma } from '../../utils/prisma';

export interface CreatePageInput {
  name: string;
  slug?: string;
  description?: string;
  pageType?: string;
  deviceType?: string;
  viewportW?: number;
  viewportH?: number;
  bgColor?: string;
}

export interface UpdatePageInput {
  name?: string;
  slug?: string;
  description?: string;
  bgColor?: string;
  sortOrder?: number;
}

export class PageService {
  async list(iterationId: string) {
    return prisma.page.findMany({
      where: { iterationId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { components: true, annotations: true } },
      },
    });
  }

  async create(iterationId: string, userId: string, input: CreatePageInput) {
    // Get next sort order
    const lastPage = await prisma.page.findFirst({
      where: { iterationId, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
    });

    // 生成唯一 slug
    let slug = input.slug || input.name.toLowerCase().replace(/\s+/g, '-');
    let counter = 1;
    const MAX_ATTEMPTS = 100;
    while (counter < MAX_ATTEMPTS) {
      const existing = await prisma.page.findFirst({
        where: { iterationId, slug, deletedAt: null },
        select: { id: true },
      });
      if (!existing) break;
      counter++;
      slug = `${input.slug || input.name.toLowerCase().replace(/\s+/g, '-')}-${counter}`;
    }
    if (counter >= MAX_ATTEMPTS) {
      slug = `${slug}-${Date.now()}`;
    }

    return prisma.page.create({
      data: {
        iterationId,
        name: input.name,
        slug,
        description: input.description,
        pageType: input.pageType || 'screen',
        deviceType: input.deviceType || 'desktop',
        viewportW: input.viewportW || 1440,
        viewportH: input.viewportH || 900,
        bgColor: input.bgColor || '#FFFFFF',
        sortOrder: (lastPage?.sortOrder || 0) + 1,
        createdBy: userId,
      },
    });
  }

  async getById(pageId: string) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      include: {
        components: {
          where: { parentId: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            children: {
              orderBy: { sortOrder: 'asc' },
            },
            annotations: {
              where: { status: { not: 'rejected' } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!page || page.deletedAt) {
      throw new Error('页面不存在');
    }

    return page;
  }

  async update(pageId: string, input: UpdatePageInput) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page || page.deletedAt) {
      throw new Error('页面不存在');
    }

    // 如果更新 slug，检查唯一性
    if (input.slug && input.slug !== page.slug) {
      let slug = input.slug;
      let counter = 1;
      const MAX_ATTEMPTS = 100;
      while (counter < MAX_ATTEMPTS) {
        const existing = await prisma.page.findFirst({
          where: {
            iterationId: page.iterationId,
            slug,
            deletedAt: null,
            id: { not: pageId },
          },
          select: { id: true },
        });
        if (!existing) break;
        counter++;
        slug = `${input.slug}-${counter}`;
      }
      if (counter >= MAX_ATTEMPTS) {
        slug = `${slug}-${Date.now()}`;
      }
      input.slug = slug;
    }

    return prisma.page.update({
      where: { id: pageId },
      data: input,
    });
  }

  async delete(pageId: string) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page || page.deletedAt) {
      throw new Error('页面不存在');
    }

    await prisma.page.update({
      where: { id: pageId },
      data: { deletedAt: new Date() },
    });
  }

  async reorder(iterationId: string, pageOrders: { pageId: string; sortOrder: number }[]) {
    // 验证所有页面都属于指定的迭代
    const pageIds = pageOrders.map(p => p.pageId);
    const pages = await prisma.page.findMany({
      where: {
        id: { in: pageIds },
        iterationId: iterationId,
      },
      select: { id: true },
    });

    if (pages.length !== pageIds.length) {
      throw new Error('部分页面不属于指定的迭代版本');
    }

    await prisma.$transaction(
      pageOrders.map(({ pageId, sortOrder }) =>
        prisma.page.update({
          where: { id: pageId },
          data: { sortOrder },
        })
      )
    );
  }

  async duplicate(pageId: string, userId: string) {
    const sourcePage = await prisma.page.findUnique({
      where: { id: pageId },
      include: {
        components: true,
      },
    });

    if (!sourcePage || sourcePage.deletedAt) {
      throw new Error('页面不存在');
    }

    // Get next sort order
    const lastPage = await prisma.page.findFirst({
      where: { iterationId: sourcePage.iterationId, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
    });

    // 生成唯一 slug
    let newSlug = `${sourcePage.slug}-copy`;
    let counter = 1;
    const MAX_ATTEMPTS = 100;
    while (counter < MAX_ATTEMPTS) {
      const existing = await prisma.page.findFirst({
        where: {
          iterationId: sourcePage.iterationId,
          slug: newSlug,
          deletedAt: null,
        },
      });
      if (!existing) break;
      counter++;
      newSlug = `${sourcePage.slug}-copy-${counter}`;
    }
    if (counter >= MAX_ATTEMPTS) {
      newSlug = `${newSlug}-${Date.now()}`;
    }

    // Create new page
    const newPage = await prisma.page.create({
      data: {
        iterationId: sourcePage.iterationId,
        name: `${sourcePage.name} (副本)`,
        slug: newSlug,
        description: sourcePage.description,
        pageType: sourcePage.pageType,
        deviceType: sourcePage.deviceType,
        viewportW: sourcePage.viewportW,
        viewportH: sourcePage.viewportH,
        bgColor: sourcePage.bgColor,
        sortOrder: (lastPage?.sortOrder || 0) + 1,
        createdBy: userId,
      },
    });

    // Copy components（保留层级关系）
    if (sourcePage.components.length > 0) {
      // 按 sortOrder 排序，确保父组件先创建
      const sortedComponents = [...sourcePage.components].sort((a, b) => a.sortOrder - b.sortOrder);
      const idMapping = new Map<string, string>(); // 旧 ID → 新 ID

      for (const comp of sortedComponents) {
        const newComp = await prisma.component.create({
          data: {
            pageId: newPage.id,
            componentType: comp.componentType,
            name: comp.name,
            props: comp.props,
            layout: comp.layout,
            styles: comp.styles,
            interactions: comp.interactions,
            states: comp.states,
            parentId: comp.parentId ? idMapping.get(comp.parentId) || null : null,
            sortOrder: comp.sortOrder,
            isLocked: comp.isLocked,
          },
        });
        idMapping.set(comp.id, newComp.id);
      }
    }

    return newPage;
  }
}

export const pageService = new PageService();
