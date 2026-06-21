import { prisma } from '../../utils/prisma';

export interface CreateProjectInput {
  name: string;
  description?: string;
  orgId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
  settings?: Record<string, any>;
}

export class ProjectService {
  async list(userId: string, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: {
          deletedAt: null,
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
        include: {
          owner: { select: { id: true, name: true, avatarUrl: true } },
          currentIteration: { select: { id: true, version: true, name: true } },
          _count: { select: { iterations: true, members: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.project.count({
        where: {
          deletedAt: null,
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
      }),
    ]);

    return { projects, total };
  }

  async create(userId: string, input: CreateProjectInput) {
    // Get user's organization if not specified
    let orgId = input.orgId;
    if (!orgId) {
      const org = await prisma.organization.findFirst({
        where: { ownerId: userId },
      });
      if (!org) {
        throw new Error('用户没有所属组织');
      }
      orgId = org.id;
    }

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: input.name,
          description: input.description,
          orgId,
          ownerId: userId,
        },
      });

      // Create default iteration
      const iteration = await tx.iteration.create({
        data: {
          projectId: newProject.id,
          name: 'v0.1 初始版本',
          version: '0.1',
          createdBy: userId,
          isCurrent: true,
        },
      });

      // Set current iteration
      await tx.project.update({
        where: { id: newProject.id },
        data: { currentIterationId: iteration.id },
      });

      // Add owner as project member
      await tx.projectMember.create({
        data: {
          projectId: newProject.id,
          userId,
          role: 'owner',
        },
      });

      return { ...newProject, currentIterationId: iteration.id };
    });

    return project;
  }

  async getById(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
          { isPublic: true },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        currentIteration: { select: { id: true, version: true, name: true, status: true } },
        iterations: {
          select: { id: true, version: true, name: true, status: true, isCurrent: true },
          orderBy: { createdAt: 'desc' },
        },
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        _count: { select: { iterations: true } },
      },
    });

    if (!project) {
      throw new Error('项目不存在');
    }

    return project;
  }

  async update(projectId: string, userId: string, input: UpdateProjectInput) {
    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId, deletedAt: null },
    });

    if (!project) {
      throw new Error('项目不存在或无权限修改');
    }

    // 明确允许更新的字段，防止 Mass Assignment
    const allowedData: Record<string, any> = {};
    if (input.name !== undefined) allowedData.name = input.name;
    if (input.description !== undefined) allowedData.description = input.description;
    if (input.isPublic !== undefined) allowedData.isPublic = input.isPublic;
    if (input.settings !== undefined) allowedData.settings = input.settings;

    return prisma.project.update({
      where: { id: projectId },
      data: allowedData,
    });
  }

  async delete(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId, deletedAt: null },
    });

    if (!project) {
      throw new Error('项目不存在或无权限删除');
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
  }
}

export const projectService = new ProjectService();
