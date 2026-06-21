import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$12$hashedpassword'),
    compare: vi.fn(),
  },
}));

// Mock auth middleware
vi.mock('../../middleware/auth', () => ({
  generateToken: vi.fn().mockReturnValue('mock-jwt-token'),
}));

import { AuthService } from '../../modules/auth/auth.service';
import { prisma } from '../../utils/prisma';
import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        return fn({
          user: { create: vi.fn().mockResolvedValue(mockUser) },
          organization: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
    });

    it('should throw error if email already exists', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'existing-user' });

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User',
        })
      ).rejects.toThrow('该邮箱已注册');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        passwordHash: '$2a$12$hashedpassword',
        isActive: true,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (prisma.user.update as any).mockResolvedValue({});

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error for non-existent user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('邮箱或密码错误');
    });

    it('should throw error for inactive user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-123',
        isActive: false,
      });

      await expect(
        authService.login({
          email: 'inactive@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('账号已被禁用');
    });

    it('should throw error for wrong password', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-123',
        passwordHash: '$2a$12$hashedpassword',
        isActive: true,
      });
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('邮箱或密码错误');
    });
  });

  describe('getMe', () => {
    it('should return user info', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        phone: null,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await authService.getMe('user-123');

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw error for non-existent user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(authService.getMe('nonexistent')).rejects.toThrow('用户不存在');
    });
  });
});
