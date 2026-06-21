import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mock prisma
vi.mock('../../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock config
vi.mock('../../config', () => ({
  config: {
    jwt: {
      secret: 'test-secret',
      expiresIn: '7d',
    },
  },
}));

import { generateToken, verifyToken, authMiddleware, optionalAuth, AuthRequest } from '../../middleware/auth';
import { createRateLimit, resetRateLimitStore } from '../../middleware/rateLimit';
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler';
import { prisma } from '../../utils/prisma';

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      ip: '127.0.0.1',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken('user-123');
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, 'test-secret') as any;
      expect(decoded.userId).toBe('user-123');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = jwt.sign({ userId: 'user-123' }, 'test-secret', { expiresIn: '1h' });
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe('user-123');
    });

    it('should throw for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });
  });

  describe('authMiddleware', () => {
    it('should return 401 if no auth header', async () => {
      await authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if auth header is malformed', async () => {
      mockReq.headers = { authorization: 'InvalidFormat' };

      await authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should call next() for valid token and active user', async () => {
      const token = jwt.sign({ userId: 'user-123' }, 'test-secret', { expiresIn: '1h' });
      mockReq.headers = { authorization: `Bearer ${token}` };

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
      });

      await authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthRequest).userId).toBe('user-123');
    });

    it('should return 401 for inactive user', async () => {
      const token = jwt.sign({ userId: 'user-123' }, 'test-secret', { expiresIn: '1h' });
      mockReq.headers = { authorization: `Bearer ${token}` };

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-123',
        isActive: false,
      });

      await authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('optionalAuth', () => {
    it('should call next() without auth header', () => {
      optionalAuth(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('Rate Limit Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    resetRateLimitStore(); // Clear global state between tests
    mockReq = {
      ip: '127.0.0.1',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    };
    mockNext = vi.fn();
  });

  it('should allow requests within limit', () => {
    const rateLimit = createRateLimit({ windowMs: 60000, max: 5 });

    rateLimit(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
  });

  it('should block requests exceeding limit', () => {
    const rateLimit = createRateLimit({ windowMs: 60000, max: 2 });

    // First two requests should pass
    rateLimit(mockReq as Request, mockRes as Response, mockNext);
    rateLimit(mockReq as Request, mockRes as Response, mockNext);

    // Third request should be blocked
    const blockedNext = vi.fn();
    rateLimit(mockReq as Request, mockRes as Response, blockedNext);

    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(blockedNext).not.toHaveBeenCalled();
  });
});

describe('Error Handler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle generic errors with 500', () => {
    const error = new Error('Something went wrong');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
        }),
      })
    );
  });

  it('should handle unique constraint errors with 409', () => {
    const error = new Error('Unique constraint failed');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
  });

  it('should handle not found errors with 404', () => {
    const error = new Error('Record to update not found');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('should return 404 for unknown routes', () => {
    notFoundHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
        }),
      })
    );
  });
});
