import { prisma } from '../../utils/prisma';

export interface CreateIterationInput {
  name: string;
  version: string;
  description?: string;
  basedOnId?: string;
}

export class IterationService {
  async list(projectId: string) {
    return prisma.iteration.findMany({
      where: { projectId },
      include: {
        _count: { select: { pages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(projectId: string, userId: string, input: CreateIterationInput) {
    // Verify project access - must be owner or member
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    });

    if (!project) {
      throw new Error('项目不存在或无权限访问');
    }

    return prisma.$transaction(async (tx) => {
      // Unset current iteration
      await tx.iteration.updateMany({
        where: { projectId, isCurrent: true },
        data: { isCurrent: false },
      });

      const iteration = await tx.iteration.create({
        data: {
          projectId,
          name: input.name,
          version: input.version,
          description: input.description,
          basedOnId: input.basedOnId,
          createdBy: userId,
          isCurrent: true,
        },
      });

      // Update project's current iteration
      await tx.project.update({
        where: { id: projectId },
        data: { currentIterationId: iteration.id },
      });

      // If based on another iteration, copy pages and components
      if (input.basedOnId) {
        await this.cloneIterationData(tx, input.basedOnId, iteration.id, userId);
      }

      return iteration;
    });
  }

  async getById(iterationId: string) {
    const iteration = await prisma.iteration.findUnique({
      where: { id: iterationId },
      include: {
        pages: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { components: true, annotations: true } },
          },
        },
        _count: { select: { pages: true } },
      },
    });

    if (!iteration) {
      throw new Error('迭代版本不存在');
    }

    return iteration;
  }

  async setCurrent(iterationId: string) {
    const iteration = await prisma.iteration.findUnique({
      where: { id: iterationId },
    });

    if (!iteration) {
      throw new Error('迭代版本不存在');
    }

    return prisma.$transaction(async (tx) => {
      await tx.iteration.updateMany({
        where: { projectId: iteration.projectId, isCurrent: true },
        data: { isCurrent: false },
      });

      // Update and return the updated iteration
      const updatedIteration = await tx.iteration.update({
        where: { id: iterationId },
        data: { isCurrent: true },
      });

      await tx.project.update({
        where: { id: iteration.projectId },
        data: { currentIterationId: iterationId },
      });

      return updatedIteration;
    });
  }

  private async cloneIterationData(tx: any, sourceIterationId: string, targetIterationId: string, userId: string) {
    // Get source pages with components
    const sourcePages = await tx.page.findMany({
      where: { iterationId: sourceIterationId, deletedAt: null },
      include: {
        components: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    for (const page of sourcePages) {
      const { id: pageId, iterationId, components, ...pageData } = page;

      const newPage = await tx.page.create({
        data: {
          ...pageData,
          iterationId: targetIterationId,
          createdBy: userId,
        },
      });

      // Build a mapping of old component IDs to new component IDs
      // This is critical for correctly remapping parentId references
      const componentIdMap = new Map<string, string>();

      // First pass: clone all components without parentId
      for (const component of components) {
        const { id: compId, pageId: compPageId, parentId, ...compData } = component;

        const newComponent = await tx.component.create({
          data: {
            ...compData,
            pageId: newPage.id,
            parentId: null, // Will be set in second pass
          },
        });

        componentIdMap.set(compId, newComponent.id);
      }

      // Second pass: update parentId references using the mapping
      for (const component of components) {
        if (component.parentId && componentIdMap.has(component.parentId)) {
          const newComponentId = componentIdMap.get(component.id)!;
          const newParentId = componentIdMap.get(component.parentId)!;

          await tx.component.update({
            where: { id: newComponentId },
            data: { parentId: newParentId },
          });
        }
      }
    }
  }
}

export const iterationService = new IterationService();
