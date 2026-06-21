import { prisma } from '../../utils/prisma';

export class ExportService {
  /**
   * 导出迭代为 Markdown 文档
   */
  async exportToMarkdown(iterationId: string) {
    const iteration = await prisma.iteration.findUnique({
      where: { id: iterationId },
      include: {
        project: { select: { name: true } },
        pages: {
          where: { deletedAt: null },
          include: {
            components: {
              orderBy: { sortOrder: 'asc' },
              include: {
                annotations: {
                  where: { status: { not: 'rejected' } },
                  orderBy: { priority: 'asc' },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!iteration) {
      throw new Error('迭代版本不存在');
    }

    let markdown = `# ${iteration.project.name} - ${iteration.name}\n\n`;
    markdown += `> 版本: ${iteration.version}\n`;
    markdown += `> 状态: ${iteration.status}\n`;
    markdown += `> 页面数: ${iteration.pages.length}\n\n`;
    markdown += `---\n\n`;

    // 目录
    markdown += `## 目录\n\n`;
    for (const page of iteration.pages) {
      markdown += `- [${page.name}](#${page.slug || page.id})\n`;
    }
    markdown += `\n---\n\n`;

    // 每个页面
    for (const page of iteration.pages) {
      markdown += `## ${page.name}\n\n`;
      markdown += `- 设备类型: ${page.deviceType}\n`;
      markdown += `- 视口尺寸: ${page.viewportW} × ${page.viewportH}\n`;
      markdown += `- 组件数量: ${page.components.length}\n\n`;

      // 组件列表
      if (page.components.length > 0) {
        markdown += `### 组件列表\n\n`;

        for (const comp of page.components) {
          markdown += `#### ${comp.name || comp.componentType}\n\n`;
          markdown += `- 类型: ${comp.componentType}\n`;
          markdown += `- 位置: (${(comp.layout as any).x}, ${(comp.layout as any).y})\n`;
          markdown += `- 尺寸: ${(comp.layout as any).w} × ${(comp.layout as any).h}\n`;

          // 组件属性
          const props = comp.props as any;
          if (Object.keys(props).length > 0) {
            markdown += `- 属性:\n`;
            for (const [key, value] of Object.entries(props)) {
              if (value !== '' && value !== null && value !== undefined) {
                markdown += `  - ${key}: ${JSON.stringify(value)}\n`;
              }
            }
          }

          // 标注
          if (comp.annotations.length > 0) {
            markdown += `- 需求标注:\n`;
            for (const anno of comp.annotations) {
              const tagStr = anno.tag ? `[${anno.tag}]` : '';
              const statusStr = this.getStatusText(anno.status);
              markdown += `  - ${tagStr} ${anno.content} (${statusStr})\n`;
            }
          }

          markdown += `\n`;
        }
      }

      markdown += `---\n\n`;
    }

    return {
      filename: `${iteration.project.name}-${iteration.version}.md`,
      content: markdown,
      mimeType: 'text/markdown',
    };
  }

  /**
   * 导出迭代为 JSON
   */
  async exportToJson(iterationId: string) {
    const iteration = await prisma.iteration.findUnique({
      where: { id: iterationId },
      include: {
        project: { select: { name: true, description: true } },
        pages: {
          where: { deletedAt: null },
          include: {
            components: {
              orderBy: { sortOrder: 'asc' },
              include: {
                annotations: {
                  where: { status: { not: 'rejected' } },
                  orderBy: { priority: 'asc' },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!iteration) {
      throw new Error('迭代版本不存在');
    }

    const exportData = {
      project: {
        name: iteration.project.name,
        description: iteration.project.description,
      },
      iteration: {
        id: iteration.id,
        name: iteration.name,
        version: iteration.version,
        status: iteration.status,
        description: iteration.description,
      },
      pages: iteration.pages.map(page => ({
        id: page.id,
        name: page.name,
        slug: page.slug,
        deviceType: page.deviceType,
        viewport: {
          width: page.viewportW,
          height: page.viewportH,
        },
        bgColor: page.bgColor,
        components: page.components.map(comp => ({
          id: comp.id,
          type: comp.componentType,
          name: comp.name,
          props: comp.props,
          layout: comp.layout,
          styles: comp.styles,
          interactions: comp.interactions,
          annotations: comp.annotations.map(anno => ({
            id: anno.id,
            type: anno.annotationType,
            content: anno.content,
            status: anno.status,
            priority: anno.priority,
            tag: anno.tag,
          })),
        })),
      })),
      exportedAt: new Date().toISOString(),
    };

    return {
      filename: `${iteration.project.name}-${iteration.version}.json`,
      content: JSON.stringify(exportData, null, 2),
      mimeType: 'application/json',
    };
  }

  /**
   * 导出标注清单
   */
  async exportAnnotations(iterationId: string, format: 'markdown' | 'json' = 'markdown') {
    const annotations = await prisma.annotation.findMany({
      where: { iterationId },
      include: {
        component: {
          select: {
            componentType: true,
            name: true,
            page: { select: { name: true } },
          },
        },
        creator: { select: { name: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    if (format === 'json') {
      return {
        filename: 'annotations.json',
        content: JSON.stringify(annotations, null, 2),
        mimeType: 'application/json',
      };
    }

    // Markdown 格式
    let markdown = `# 需求标注清单\n\n`;
    markdown += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    markdown += `> 标注总数: ${annotations.length}\n\n`;
    markdown += `---\n\n`;

    // 按 R1/R2/R3 分组
    const grouped = {
      R1: annotations.filter(a => a.tag === 'R1'),
      R2: annotations.filter(a => a.tag === 'R2'),
      R3: annotations.filter(a => a.tag === 'R3'),
      other: annotations.filter(a => !a.tag),
    };

    if (grouped.R1.length > 0) {
      markdown += `## R1 - 必须项 (${grouped.R1.length})\n\n`;
      for (const anno of grouped.R1) {
        markdown += this.formatAnnotation(anno);
      }
    }

    if (grouped.R2.length > 0) {
      markdown += `## R2 - 期望项 (${grouped.R2.length})\n\n`;
      for (const anno of grouped.R2) {
        markdown += this.formatAnnotation(anno);
      }
    }

    if (grouped.R3.length > 0) {
      markdown += `## R3 - 参考项 (${grouped.R3.length})\n\n`;
      for (const anno of grouped.R3) {
        markdown += this.formatAnnotation(anno);
      }
    }

    if (grouped.other.length > 0) {
      markdown += `## 其他标注 (${grouped.other.length})\n\n`;
      for (const anno of grouped.other) {
        markdown += this.formatAnnotation(anno);
      }
    }

    return {
      filename: 'annotations.md',
      content: markdown,
      mimeType: 'text/markdown',
    };
  }

  /**
   * HTML 转义（防 XSS）
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 导出为 HTML（可转换为 PDF）
   */
  async exportToHtml(iterationId: string) {
    const iteration = await prisma.iteration.findUnique({
      where: { id: iterationId },
      include: {
        project: { select: { name: true, description: true } },
        pages: {
          where: { deletedAt: null },
          include: {
            components: {
              orderBy: { sortOrder: 'asc' },
              include: {
                annotations: {
                  where: { status: { not: 'rejected' } },
                  orderBy: { priority: 'asc' },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!iteration) {
      throw new Error('迭代版本不存在');
    }

    const esc = this.escapeHtml.bind(this);

    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${esc(iteration.project.name)} - ${esc(iteration.name)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 40px; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }
    h2 { color: #2563eb; margin-top: 40px; }
    h3 { color: #4b5563; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    .page { border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .component { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 12px; }
    .component-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .tag-R1 { background: #fee2e2; color: #dc2626; }
    .tag-R2 { background: #fef3c7; color: #d97706; }
    .tag-R3 { background: #f3f4f6; color: #6b7280; }
    .annotation { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 8px 12px; margin-top: 8px; font-size: 14px; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .status-open { background: #dbeafe; color: #2563eb; }
    .status-resolved { background: #dcfce7; color: #16a34a; }
    .status-accepted { background: #e0e7ff; color: #4f46e5; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    .toc { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 32px; }
    .toc ul { list-style: none; padding: 0; }
    .toc li { padding: 4px 0; }
    .toc a { color: #2563eb; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    @media print {
      body { padding: 20px; }
      .page { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${esc(iteration.project.name)}</h1>
  <div class="meta">
    <strong>迭代版本:</strong> ${esc(iteration.name)} (v${esc(iteration.version)})<br>
    <strong>状态:</strong> ${esc(iteration.status)}<br>
    <strong>页面数:</strong> ${iteration.pages.length}<br>
    ${iteration.description ? `<strong>描述:</strong> ${esc(iteration.description)}<br>` : ''}
    <strong>导出时间:</strong> ${new Date().toLocaleString('zh-CN')}
  </div>

  <div class="toc">
    <h3>目录</h3>
    <ul>
      ${iteration.pages.map((page, i) => `<li><a href="#page-${i}">${esc(page.name)}</a> (${page.components.length} 个组件)</li>`).join('\n      ')}
    </ul>
  </div>
`;

    // 每个页面
    iteration.pages.forEach((page, pageIndex) => {
      html += `
  <div class="page" id="page-${pageIndex}">
    <div class="page-header">
      <h2>${esc(page.name)}</h2>
      <span class="meta">${esc(page.deviceType)} · ${page.viewportW}×${page.viewportH}</span>
    </div>
`;

      if (page.components.length > 0) {
        html += `    <table>
      <thead>
        <tr>
          <th>组件</th>
          <th>类型</th>
          <th>位置</th>
          <th>尺寸</th>
          <th>标注</th>
        </tr>
      </thead>
      <tbody>
`;

        page.components.forEach((comp) => {
          const layout = comp.layout as any;
          const annotations = comp.annotations.map((a) => {
            const tagClass = a.tag ? `tag-${a.tag}` : '';
            return `<span class="tag ${tagClass}">${esc(a.tag || '标注')}</span> ${esc(a.content)}`;
          }).join('<br>');

          html += `        <tr>
          <td><strong>${esc(comp.name || '-')}</strong></td>
          <td>${esc(comp.componentType)}</td>
          <td>(${layout.x}, ${layout.y})</td>
          <td>${layout.w} × ${layout.h}</td>
          <td>${annotations || '-'}</td>
        </tr>
`;
        });

        html += `      </tbody>
    </table>
`;
      } else {
        html += `    <p class="meta">暂无组件</p>
`;
      }

      html += `  </div>
`;
    });

    html += `
</body>
</html>`;

    return {
      filename: `${iteration.project.name}-${iteration.version}.html`,
      content: html,
      mimeType: 'text/html',
    };
  }

  private formatAnnotation(anno: any): string {
    let text = `- **${anno.component.page.name} / ${anno.component.name || anno.component.componentType}**\n`;
    text += `  - 内容: ${anno.content}\n`;
    text += `  - 状态: ${this.getStatusText(anno.status)}\n`;
    text += `  - 创建者: ${anno.creator.name}\n\n`;
    return text;
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      open: '待评审',
      resolved: '已解决',
      accepted: '已确认',
      rejected: '已拒绝',
    };
    return statusMap[status] || status;
  }
}

export const exportService = new ExportService();
