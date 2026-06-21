import { prisma } from '../../utils/prisma';

export interface CreateComponentInput {
  componentType: string;
  name?: string;
  props?: Record<string, any>;
  layout: { x: number; y: number; w: number; h: number };
  styles?: Record<string, any>;
  interactions?: any[];
  parentId?: string;
  sortOrder?: number;
}

export interface UpdateComponentInput {
  name?: string;
  props?: Record<string, any>;
  layout?: { x: number; y: number; w: number; h: number };
  styles?: Record<string, any>;
  interactions?: any[];
  states?: Record<string, any>;
  sortOrder?: number;
  isLocked?: boolean;
}

export class ComponentService {
  async list(pageId: string) {
    return prisma.component.findMany({
      where: { pageId },
      orderBy: { sortOrder: 'asc' },
      include: {
        annotations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async create(pageId: string, input: CreateComponentInput) {
    // Verify page exists
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page || page.deletedAt) {
      throw new Error('页面不存在');
    }

    return prisma.component.create({
      data: {
        pageId,
        componentType: input.componentType,
        name: input.name,
        props: input.props || {},
        layout: input.layout,
        styles: input.styles || {},
        interactions: input.interactions || [],
        parentId: input.parentId,
        sortOrder: input.sortOrder || 0,
      },
    });
  }

  async update(componentId: string, input: UpdateComponentInput) {
    const component = await prisma.component.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      throw new Error('组件不存在');
    }

    return prisma.component.update({
      where: { id: componentId },
      data: input,
    });
  }

  async delete(componentId: string) {
    const component = await prisma.component.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      throw new Error('组件不存在');
    }

    // 递归获取所有后代组件 ID（带循环检测）
    const getAllDescendantIds = async (parentId: string, visited = new Set<string>(), depth = 0): Promise<string[]> => {
      if (depth > 50) {
        throw new Error('组件层级过深，可能存在循环引用，请检查数据完整性');
      }

      const children = await prisma.component.findMany({
        where: { parentId },
        select: { id: true },
      });

      const ids: string[] = [];
      for (const child of children) {
        if (visited.has(child.id)) {
          throw new Error(`检测到组件循环引用: ${child.id}`);
        }
        visited.add(child.id);
        ids.push(child.id);
        const descendantIds = await getAllDescendantIds(child.id, visited, depth + 1);
        ids.push(...descendantIds);
      }
      return ids;
    };

    const descendantIds = await getAllDescendantIds(componentId);

    // Delete all descendants and the component itself
    await prisma.$transaction(async (tx) => {
      // 先删除所有标注评论
      await tx.annotationComment.deleteMany({
        where: { annotation: { componentId: { in: [...descendantIds, componentId] } } },
      });
      // 删除所有标注
      await tx.annotation.deleteMany({
        where: { componentId: { in: [...descendantIds, componentId] } },
      });
      // 删除所有后代组件
      if (descendantIds.length > 0) {
        await tx.component.deleteMany({
          where: { id: { in: descendantIds } },
        });
      }
      // 删除组件本身
      await tx.component.delete({
        where: { id: componentId },
      });
    });
  }

  async batchCreate(pageId: string, components: CreateComponentInput[]) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page || page.deletedAt) {
      throw new Error('页面不存在');
    }

    return prisma.$transaction(
      components.map((comp, index) =>
        prisma.component.create({
          data: {
            pageId,
            componentType: comp.componentType,
            name: comp.name,
            props: comp.props || {},
            layout: comp.layout,
            styles: comp.styles || {},
            interactions: comp.interactions || [],
            parentId: comp.parentId,
            sortOrder: comp.sortOrder ?? index,
          },
        })
      )
    );
  }

  async batchUpdate(pageId: string, updates: { id: string; data: UpdateComponentInput }[]) {
    // First, verify all components belong to the specified page
    const componentIds = updates.map(u => u.id);
    const existingComponents = await prisma.component.findMany({
      where: {
        id: { in: componentIds },
        pageId: pageId, // Ownership check
      },
      select: { id: true },
    });

    const existingIds = new Set(existingComponents.map(c => c.id));
    const invalidIds = componentIds.filter(id => !existingIds.has(id));

    if (invalidIds.length > 0) {
      throw new Error(`以下组件不属于页面 ${pageId}: ${invalidIds.join(', ')}`);
    }

    // Now perform the updates
    return prisma.$transaction(
      updates.map(({ id, data }) =>
        prisma.component.update({
          where: { id },
          data,
        })
      )
    );
  }
}

export const componentService = new ComponentService();
