import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 内存存储（生产环境应使用 Redis）
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * 重置速率限制存储（仅用于测试）
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

// 定期清理过期条目
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // 每分钟清理一次

export interface RateLimitOptions {
  windowMs: number;  // 时间窗口（毫秒）
  max: number;       // 最大请求数
  message?: string;  // 超限消息
  keyGenerator?: (req: Request) => string;  // 自定义 key 生成
}

/**
 * 创建速率限制中间件
 */
export function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs = 60 * 1000,  // 默认 1 分钟
    max = 100,              // 默认 100 次
    message = '请求过于频繁，请稍后再试',
    keyGenerator = (req) => req.ip || 'unknown',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // 如果条目不存在或已过期，创建新条目
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(key, entry);
    }

    // 增加计数
    entry.count++;

    // 设置响应头
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    // 检查是否超限
    if (entry.count > max) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        },
      });
      return;
    }

    next();
  };
}

/**
 * 认证端点速率限制（更严格）
 */
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 20,                     // 最多 20 次
  message: '登录尝试过于频繁，请 15 分钟后再试',
  keyGenerator: (req) => `auth:${req.ip}`,
});

/**
 * 验证码发送速率限制
 */
export const verificationRateLimit = createRateLimit({
  windowMs: 60 * 1000,  // 1 分钟
  max: 3,                // 最多 3 次
  message: '验证码发送过于频繁，请 1 分钟后再试',
  keyGenerator: (req) => `verify:${req.body?.phone || req.ip}`,
});

/**
 * API 通用速率限制
 */
export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000,   // 1 分钟
  max: 200,               // 最多 200 次
  message: 'API 请求过于频繁，请稍后再试',
});
