import { prisma } from './prisma';

/**
 * 检查用户是否有权访问项目
 * @param userId 用户 ID
 * @param projectId 项目 ID
 * @returns 如果用户是项目所有者或成员，返回 true
 * @throws 如果用户无权访问，抛出错误
 */
export async function checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    throw new Error('项目不存在');
  }

  // 检查是否是项目所有者
  if (project.ownerId === userId) {
    return true;
  }

  // 检查是否是项目成员
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (!member) {
    throw new Error('无权访问此项目');
  }

  return true;
}

/**
 * 检查用户是否有权访问迭代
 * @param userId 用户 ID
 * @param iterationId 迭代 ID
 * @returns 如果用户有权访问，返回迭代信息
 * @throws 如果用户无权访问，抛出错误
 */
export async function checkIterationAccess(userId: string, iterationId: string) {
  const iteration = await prisma.iteration.findUnique({
    where: { id: iterationId },
    select: { id: true, projectId: true },
  });

  if (!iteration) {
    throw new Error('迭代不存在');
  }

  await checkProjectAccess(userId, iteration.projectId);
  return iteration;
}

/**
 * 检查用户是否有权访问页面
 * @param userId 用户 ID
 * @param pageId 页面 ID
 * @returns 如果用户有权访问，返回页面信息（包含 iterationId 和 projectId）
 * @throws 如果用户无权访问，抛出错误
 */
export async function checkPageAccess(userId: string, pageId: string) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: {
      id: true,
      iterationId: true,
      iteration: {
        select: { projectId: true },
      },
    },
  });

  if (!page) {
    throw new Error('页面不存在');
  }

  await checkProjectAccess(userId, page.iteration.projectId);
  return page;
}
