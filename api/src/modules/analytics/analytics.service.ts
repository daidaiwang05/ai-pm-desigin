import { prisma } from '../../utils/prisma';

export interface AccessLogInput {
  previewLinkId: string;
  visitorId: string;
  ip?: string;
  userAgent?: string;
  referer?: string;
  deviceType?: string;
  browser?: string;
}

export class AnalyticsService {
  /**
   * 记录访问
   */
  async logAccess(input: AccessLogInput) {
    const now = new Date();

    // 查找或创建访问记录
    const existingLog = await prisma.previewAccessLog.findUnique({
      where: {
        previewLinkId_visitorId: {
          previewLinkId: input.previewLinkId,
          visitorId: input.visitorId,
        },
      },
    });

    if (existingLog) {
      // 更新现有记录 - 累计停留时长
      const sessionGap = Math.floor((now.getTime() - existingLog.lastVisitAt.getTime()) / 1000);
      // 只有间隔小于 30 分钟才认为是同一会话
      const isNewSession = sessionGap > 30 * 60;

      await prisma.previewAccessLog.update({
        where: { id: existingLog.id },
        data: {
          lastVisitAt: now,
          visitCount: { increment: 1 },
          pageViews: { increment: 1 },
          // 累计停留时长（仅计算会话内间隔）
          duration: isNewSession ? existingLog.duration : existingLog.duration + sessionGap,
        },
      });
    } else {
      // 创建新记录
      await prisma.previewAccessLog.create({
        data: {
          previewLinkId: input.previewLinkId,
          visitorId: input.visitorId,
          ip: input.ip,
          userAgent: input.userAgent,
          referer: input.referer,
          deviceType: input.deviceType || this.detectDeviceType(input.userAgent),
          browser: this.detectBrowser(input.userAgent),
          firstVisitAt: now,
          lastVisitAt: now,
        },
      });

      // 更新唯一访客数
      await prisma.previewLink.update({
        where: { id: input.previewLinkId },
        data: { uniqueVisitors: { increment: 1 } },
      });
    }

    // 更新总访问次数
    await prisma.previewLink.update({
      where: { id: input.previewLinkId },
      data: {
        viewCount: { increment: 1 },
        lastAccessedAt: now,
      },
    });
  }

  /**
   * 获取预览链接的统计数据
   */
  async getStats(previewLinkId: string) {
    const link = await prisma.previewLink.findUnique({
      where: { id: previewLinkId },
      select: {
        viewCount: true,
        uniqueVisitors: true,
        lastAccessedAt: true,
        createdAt: true,
      },
    });

    if (!link) {
      throw new Error('预览链接不存在');
    }

    // 获取访问日志统计
    const accessLogs = await prisma.previewAccessLog.findMany({
      where: { previewLinkId },
      orderBy: { lastVisitAt: 'desc' },
    });

    // 按设备类型统计
    const byDevice = accessLogs.reduce((acc, log) => {
      const device = log.deviceType || 'unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 按浏览器统计
    const byBrowser = accessLogs.reduce((acc, log) => {
      const browser = log.browser || 'unknown';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 按日期统计（最近7天）
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyVisits = last7Days.map((date) => {
      const dayLogs = accessLogs.filter((log) => {
        const logDate = log.firstVisitAt.toISOString().split('T')[0];
        return logDate === date;
      });
      return {
        date,
        visits: dayLogs.reduce((sum, log) => sum + log.visitCount, 0),
        visitors: dayLogs.length,
      };
    });

    // 平均停留时长
    const avgDuration = accessLogs.length > 0
      ? Math.round(accessLogs.reduce((sum, log) => sum + log.duration, 0) / accessLogs.length)
      : 0;

    // 来源统计
    const byReferer = accessLogs.reduce((acc, log) => {
      const referer = log.referer || '直接访问';
      let domain = '直接访问';
      if (referer !== '直接访问') {
        try {
          domain = new URL(referer).hostname;
        } catch {
          // 非 URL 格式的 referer，直接使用原始值
          domain = referer.length > 50 ? referer.substring(0, 50) + '...' : referer;
        }
      }
      acc[domain] = (acc[domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      overview: {
        totalViews: link.viewCount,
        uniqueVisitors: link.uniqueVisitors,
        avgDuration,
        lastAccessedAt: link.lastAccessedAt,
        createdAt: link.createdAt,
      },
      byDevice,
      byBrowser,
      byReferer,
      dailyVisits,
      recentVisitors: accessLogs.slice(0, 10).map((log) => ({
        visitorId: log.visitorId,
        deviceType: log.deviceType,
        browser: log.browser,
        visitCount: log.visitCount,
        duration: log.duration,
        lastVisitAt: log.lastVisitAt,
      })),
    };
  }

  /**
   * 获取迭代版本的统计数据
   */
  async getIterationStats(iterationId: string) {
    const links = await prisma.previewLink.findMany({
      where: { iterationId },
      select: { id: true },
    });

    const linkIds = links.map((l) => l.id);

    const totalViews = await prisma.previewLink.aggregate({
      where: { iterationId },
      _sum: { viewCount: true, uniqueVisitors: true },
    });

    const dailyStats = await prisma.previewAccessLog.groupBy({
      by: ['firstVisitAt'],
      where: { previewLinkId: { in: linkIds } },
      _count: { id: true },
      _sum: { visitCount: true },
    });

    return {
      totalViews: totalViews._sum.viewCount || 0,
      uniqueVisitors: totalViews._sum.uniqueVisitors || 0,
      linkCount: links.length,
    };
  }

  /**
   * 检测设备类型
   */
  private detectDeviceType(userAgent?: string | null): string {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * 检测浏览器
   */
  private detectBrowser(userAgent?: string | null): string {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edge')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    return 'Other';
  }
}

export const analyticsService = new AnalyticsService();
