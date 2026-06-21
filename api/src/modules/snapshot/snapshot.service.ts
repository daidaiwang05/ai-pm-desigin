import { prisma } from '../../utils/prisma';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface SnapshotData {
  iterationId: string;
  version: string;
  name: string;
  pages: any[];
  createdAt: string;
  createdBy: string;
}

export class SnapshotService {
  /**
   * 创建快照
   */
  async createSnapshot(iterationId: string, userId: string, name?: string) {
    // 获取迭代及其所有页面和组件
    const iteration = await prisma.iteration.findUnique({
      where: { id: iterationId },
      include: {
        pages: {
          where: { deletedAt: null },
          include: {
            components: {
              orderBy: { sortOrder: 'asc' },
            },
            annotations: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!iteration) {
      throw new Error('迭代版本不存在');
    }

    // 构建快照数据
    const snapshotData: SnapshotData = {
      iterationId: iteration.id,
      version: iteration.version,
      name: name || `快照 ${new Date().toLocaleString('zh-CN')}`,
      pages: iteration.pages.map(page => ({
        id: page.id,
        name: page.name,
        slug: page.slug,
        pageType: page.pageType,
        deviceType: page.deviceType,
        viewportW: page.viewportW,
        viewportH: page.viewportH,
        bgColor: page.bgColor,
        sortOrder: page.sortOrder,
        components: page.components.map(comp => ({
          id: comp.id,
          componentType: comp.componentType,
          name: comp.name,
          props: comp.props,
          layout: comp.layout,
          styles: comp.styles,
          interactions: comp.interactions,
          states: comp.states,
          parentId: comp.parentId,
          sortOrder: comp.sortOrder,
        })),
        annotations: page.annotations.map(anno => ({
          id: anno.id,
          componentId: anno.componentId,
          annotationType: anno.annotationType,
          content: anno.content,
          status: anno.status,
          priority: anno.priority,
          tag: anno.tag,
        })),
      })),
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    // 压缩快照数据
    const jsonString = JSON.stringify(snapshotData);
    const compressed = await gzipAsync(Buffer.from(jsonString));

    // 存储快照（这里简化为数据库存储，生产环境应使用 S3）
    const snapshot = await prisma.snapshot.create({
      data: {
        iterationId,
        name: snapshotData.name,
        version: iteration.version,
        data: compressed.toString('base64'),
        size: compressed.length,
        pageCount: snapshotData.pages.length,
        componentCount: snapshotData.pages.reduce(
          (sum, page) => sum + page.components.length,
          0
        ),
        createdBy: userId,
      },
    });

    return {
      id: snapshot.id,
      name: snapshot.name,
      version: snapshot.version,
      pageCount: snapshot.pageCount,
      componentCount: snapshot.componentCount,
      size: snapshot.size,
      createdAt: snapshot.createdAt,
    };
  }

  /**
   * 获取快照列表
   */
  async listSnapshots(iterationId: string) {
    return prisma.snapshot.findMany({
      where: { iterationId },
      select: {
        id: true,
        name: true,
        version: true,
        pageCount: true,
        componentCount: true,
        size: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取快照详情
   */
  async getSnapshot(snapshotId: string) {
    const snapshot = await prisma.snapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new Error('快照不存在');
    }

    // 解压快照数据
    const compressed = Buffer.from(snapshot.data, 'base64');
    const decompressed = await gunzipAsync(compressed);
    const data: SnapshotData = JSON.parse(decompressed.toString());

    return {
      id: snapshot.id,
      name: snapshot.name,
      version: snapshot.version,
      data,
      pageCount: snapshot.pageCount,
      componentCount: snapshot.componentCount,
      size: snapshot.size,
      createdAt: snapshot.createdAt,
    };
  }

  /**
   * 恢复快照
   */
  async restoreSnapshot(snapshotId: string, userId: string) {
    const snapshot = await this.getSnapshot(snapshotId);

    // 创建新迭代
    const newIteration = await prisma.$transaction(async (tx) => {
      // 取消当前迭代的 current 状态
      await tx.iteration.updateMany({
        where: {
          projectId: (await tx.iteration.findUnique({
            where: { id: snapshot.data.iterationId },
          }))!.projectId,
          isCurrent: true,
        },
        data: { isCurrent: false },
      });

      // 创建新迭代
      const iteration = await tx.iteration.create({
        data: {
          projectId: (await tx.iteration.findUnique({
            where: { id: snapshot.data.iterationId },
          }))!.projectId,
          name: `恢复自 ${snapshot.name}`,
          version: `${snapshot.version}-restore-${Date.now()}`,
          description: `从快照 "${snapshot.name}" 恢复`,
          basedOnId: snapshot.data.iterationId,
          createdBy: userId,
          isCurrent: true,
        },
      });

      // 恢复页面和组件
      for (const pageData of snapshot.data.pages) {
        const page = await tx.page.create({
          data: {
            iterationId: iteration.id,
            name: pageData.name,
            slug: pageData.slug,
            pageType: pageData.pageType,
            deviceType: pageData.deviceType,
            viewportW: pageData.viewportW,
            viewportH: pageData.viewportH,
            bgColor: pageData.bgColor,
            sortOrder: pageData.sortOrder,
            createdBy: userId,
          },
        });

        // 恢复组件（保留层级关系）
        const sortedComponents = [...pageData.components].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
        const idMapping = new Map<string, string>(); // 旧 ID → 新 ID

        for (const compData of sortedComponents) {
          const newComp = await tx.component.create({
            data: {
              pageId: page.id,
              componentType: compData.componentType,
              name: compData.name,
              props: compData.props,
              layout: compData.layout,
              styles: compData.styles,
              interactions: compData.interactions,
              states: compData.states,
              parentId: compData.parentId ? idMapping.get(compData.parentId) || null : null,
              sortOrder: compData.sortOrder,
            },
          });
          idMapping.set(compData.id, newComp.id);
        }
      }

      return iteration;
    });

    return newIteration;
  }

  /**
   * 对比两个快照
   */
  async diffSnapshots(snapshotId1: string, snapshotId2: string) {
    const [snapshot1, snapshot2] = await Promise.all([
      this.getSnapshot(snapshotId1),
      this.getSnapshot(snapshotId2),
    ]);

    return this.calculateDiff(snapshot1.data, snapshot2.data);
  }

  /**
   * 计算两个快照的差异
   */
  private calculateDiff(before: SnapshotData, after: SnapshotData) {
    const diff: any = {
      pages: { added: [], removed: [], modified: [] },
      summary: {
        pagesAdded: 0,
        pagesRemoved: 0,
        pagesModified: 0,
        componentsAdded: 0,
        componentsRemoved: 0,
        componentsModified: 0,
      },
    };

    const beforePages = new Map(before.pages.map(p => [p.id, p]));
    const afterPages = new Map(after.pages.map(p => [p.id, p]));

    // 查找新增的页面
    for (const [id, page] of afterPages) {
      if (!beforePages.has(id)) {
        diff.pages.added.push({ id, name: page.name });
        diff.summary.pagesAdded++;
        diff.summary.componentsAdded += page.components.length;
      }
    }

    // 查找删除的页面
    for (const [id, page] of beforePages) {
      if (!afterPages.has(id)) {
        diff.pages.removed.push({ id, name: page.name });
        diff.summary.pagesRemoved++;
        diff.summary.componentsRemoved += page.components.length;
      }
    }

    // 查找修改的页面
    for (const [id, beforePage] of beforePages) {
      const afterPage = afterPages.get(id);
      if (afterPage) {
        const pageDiff = this.diffPages(beforePage, afterPage);
        if (pageDiff.hasChanges) {
          diff.pages.modified.push(pageDiff);
          diff.summary.pagesModified++;
          diff.summary.componentsAdded += pageDiff.componentsAdded;
          diff.summary.componentsRemoved += pageDiff.componentsRemoved;
          diff.summary.componentsModified += pageDiff.componentsModified;
        }
      }
    }

    return diff;
  }

  /**
   * 对比两个页面
   */
  private diffPages(before: any, after: any) {
    const result: any = {
      id: before.id,
      name: before.name,
      hasChanges: false,
      propertyChanges: [],
      componentsAdded: 0,
      componentsRemoved: 0,
      componentsModified: 0,
      componentDetails: [],
    };

    // 检查页面属性变化
    const propsToCheck = ['name', 'slug', 'bgColor', 'viewportW', 'viewportH'];
    for (const prop of propsToCheck) {
      if (before[prop] !== after[prop]) {
        result.propertyChanges.push({
          property: prop,
          before: before[prop],
          after: after[prop],
        });
        result.hasChanges = true;
      }
    }

    // 对比组件
    const beforeComps = new Map(before.components.map((c: any) => [c.id, c]));
    const afterComps = new Map(after.components.map((c: any) => [c.id, c]));

    // 新增组件
    for (const [id, comp] of afterComps) {
      if (!beforeComps.has(id)) {
        result.componentsAdded++;
        result.componentDetails.push({
          type: 'added',
          id,
          componentType: comp.componentType,
          name: comp.name,
        });
        result.hasChanges = true;
      }
    }

    // 删除组件
    for (const [id, comp] of beforeComps) {
      if (!afterComps.has(id)) {
        result.componentsRemoved++;
        result.componentDetails.push({
          type: 'removed',
          id,
          componentType: comp.componentType,
          name: comp.name,
        });
        result.hasChanges = true;
      }
    }

    // 修改组件
    for (const [id, beforeComp] of beforeComps) {
      const afterComp = afterComps.get(id);
      if (afterComp) {
        const compDiff = this.diffComponents(beforeComp, afterComp);
        if (compDiff.hasChanges) {
          result.componentsModified++;
          result.componentDetails.push(compDiff);
          result.hasChanges = true;
        }
      }
    }

    return result;
  }

  /**
   * 对比两个组件
   */
  private diffComponents(before: any, after: any) {
    const result: any = {
      type: 'modified',
      id: before.id,
      componentType: before.componentType,
      name: before.name,
      hasChanges: false,
      changes: [],
    };

    // 检查 props 变化
    const propsChanges = this.diffObjects(before.props, after.props, 'props');
    if (propsChanges.length > 0) {
      result.changes.push(...propsChanges);
      result.hasChanges = true;
    }

    // 检查 layout 变化
    const layoutChanges = this.diffObjects(before.layout, after.layout, 'layout');
    if (layoutChanges.length > 0) {
      result.changes.push(...layoutChanges);
      result.hasChanges = true;
    }

    // 检查 styles 变化
    const stylesChanges = this.diffObjects(before.styles, after.styles, 'styles');
    if (stylesChanges.length > 0) {
      result.changes.push(...stylesChanges);
      result.hasChanges = true;
    }

    return result;
  }

  /**
   * 对比两个对象
   */
  private diffObjects(before: any, after: any, path: string): any[] {
    const changes: any[] = [];
    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);

    for (const key of allKeys) {
      const beforeVal = before?.[key];
      const afterVal = after?.[key];

      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        changes.push({
          path: `${path}.${key}`,
          before: beforeVal,
          after: afterVal,
        });
      }
    }

    return changes;
  }

  /**
   * 删除快照
   */
  async deleteSnapshot(snapshotId: string) {
    const snapshot = await prisma.snapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new Error('快照不存在');
    }

    await prisma.snapshot.delete({
      where: { id: snapshotId },
    });
  }
}

export const snapshotService = new SnapshotService();
