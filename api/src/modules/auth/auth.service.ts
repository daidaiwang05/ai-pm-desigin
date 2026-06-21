import bcrypt from 'bcryptjs';
import { prisma } from '../../utils/prisma';
import { generateToken } from '../../middleware/auth';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('该邮箱已注册');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    // Create user and default organization in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
      });

      // Create default organization
      await tx.organization.create({
        data: {
          name: `${input.name} 的组织`,
          slug: `org-${newUser.id.substring(0, 8)}`,
          ownerId: newUser.id,
        },
      });

      return newUser;
    });

    const token = generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error('邮箱或密码错误');
    }

    if (!user.isActive) {
      throw new Error('账号已被禁用');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('邮箱或密码错误');
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        phone: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return user;
  }
}

export const authService = new AuthService();
