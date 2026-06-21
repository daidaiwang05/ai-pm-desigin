import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { sendError } from '../utils/response';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  // Normalize non-Error values (Express can pass any value to next())
  const error = err instanceof Error ? err : new Error(String(err ?? 'Unknown error'));
  const message = error.message || '';

  console.error(`[Error] ${req.method} ${req.path}:`, message);

  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }

  // Prisma business-logic errors (don't report to Sentry)
  if (message.includes('Unique constraint')) {
    sendError(res, 'CONFLICT', '资源已存在', 409);
    return;
  }

  if (message.includes('Record to update not found')) {
    sendError(res, 'NOT_FOUND', '资源不存在', 404);
    return;
  }

  // Only report truly unexpected errors to Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }

  sendError(res, 'INTERNAL_ERROR', '服务器内部错误', 500);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 'NOT_FOUND', `路由 ${req.method} ${req.path} 不存在`, 404);
}
