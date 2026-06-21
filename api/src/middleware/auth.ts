import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { sendError } from '../utils/response';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, config.jwt.secret) as { userId: string };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'UNAUTHORIZED', '未提供认证令牌', 401);
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      sendError(res, 'UNAUTHORIZED', '用户不存在或已禁用', 401);
      return;
    }

    req.userId = user.id;
    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 'UNAUTHORIZED', '令牌已过期', 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, 'UNAUTHORIZED', '无效的认证令牌', 401);
    } else {
      sendError(res, 'INTERNAL_ERROR', '认证服务异常', 500);
    }
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  authMiddleware(req, res, next);
}
