import { prisma } from '../../utils/prisma';
import { generateToken } from '../../middleware/auth';

// SSO 提供商配置
interface SSOConfig {
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  github: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  wechat: {
    appId: string;
    appSecret: string;
    redirectUri: string;
  };
}

export class SSOService {
  private config: SSOConfig;

  constructor() {
    this.config = {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback/google',
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/auth/callback/github',
      },
      wechat: {
        appId: process.env.WECHAT_APP_ID || '',
        appSecret: process.env.WECHAT_APP_SECRET || '',
        redirectUri: process.env.WECHAT_REDIRECT_URI || 'http://localhost:3000/auth/callback/wechat',
      },
    };
  }

  /**
   * 获取 SSO 授权 URL
   */
  getAuthUrl(provider: 'google' | 'github' | 'wechat'): string {
    switch (provider) {
      case 'google':
        return this.getGoogleAuthUrl();
      case 'github':
        return this.getGithubAuthUrl();
      case 'wechat':
        return this.getWechatAuthUrl();
      default:
        throw new Error(`不支持的 SSO 提供商: ${provider}`);
    }
  }

  /**
   * 处理 SSO 回调
   */
  async handleCallback(
    provider: 'google' | 'github' | 'wechat',
    code: string
  ): Promise<{ token: string; user: any }> {
    switch (provider) {
      case 'google':
        return this.handleGoogleCallback(code);
      case 'github':
        return this.handleGithubCallback(code);
      case 'wechat':
        return this.handleWechatCallback(code);
      default:
        throw new Error(`不支持的 SSO 提供商: ${provider}`);
    }
  }

  // ==================== Google SSO ====================

  private getGoogleAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.google.clientId,
      redirect_uri: this.config.google.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private async handleGoogleCallback(code: string) {
    // 1. 交换 access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: this.config.google.clientId,
        client_secret: this.config.google.clientSecret,
        redirect_uri: this.config.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('Google 授权失败');
    }

    // 2. 获取用户信息
    const userResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const userData = await userResponse.json();

    // 3. 查找或创建用户
    return this.findOrCreateUser({
      provider: 'google',
      providerId: userData.id,
      email: userData.email,
      name: userData.name,
      avatarUrl: userData.picture,
    });
  }

  // ==================== GitHub SSO ====================

  private getGithubAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.github.clientId,
      redirect_uri: this.config.github.redirectUri,
      scope: 'user:email',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  private async handleGithubCallback(code: string) {
    // 1. 交换 access token
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          code,
          client_id: this.config.github.clientId,
          client_secret: this.config.github.clientSecret,
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('GitHub 授权失败');
    }

    // 2. 获取用户信息
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    // 3. 获取邮箱（如果用户没有公开邮箱）
    let email = userData.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      const emails = await emailResponse.json();
      const primaryEmail = emails.find((e: any) => e.primary);
      email = primaryEmail?.email || `${userData.id}@github.temp`;
    }

    // 4. 查找或创建用户
    return this.findOrCreateUser({
      provider: 'github',
      providerId: String(userData.id),
      email,
      name: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
    });
  }

  // ==================== WeChat SSO ====================

  private getWechatAuthUrl(): string {
    const params = new URLSearchParams({
      appid: this.config.wechat.appId,
      redirect_uri: this.config.wechat.redirectUri,
      response_type: 'code',
      scope: 'snsapi_login',
      state: 'wechat',
    });
    return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  }

  private async handleWechatCallback(code: string) {
    // 1. 交换 access token
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.config.wechat.appId}&secret=${this.config.wechat.appSecret}&code=${code}&grant_type=authorization_code`;
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('微信授权失败');
    }

    // 2. 获取用户信息
    const userUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`;
    const userResponse = await fetch(userUrl);
    const userData = await userResponse.json();

    // 3. 查找或创建用户
    return this.findOrCreateUser({
      provider: 'wechat',
      providerId: userData.openid,
      email: `${userData.openid}@wechat.temp`,
      name: userData.nickname,
      avatarUrl: userData.headimgurl,
    });
  }

  // ==================== Common ====================

  private async findOrCreateUser(profile: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    // 查找已有用户
    let user = await prisma.user.findFirst({
      where: {
        provider: profile.provider,
        providerId: profile.providerId,
      },
    });

    if (!user) {
      try {
        // 检查邮箱是否已注册
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email },
        });

        if (existingUser) {
          // 关联 SSO 到已有账号
          user = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              provider: profile.provider,
              providerId: profile.providerId,
              avatarUrl: profile.avatarUrl || existingUser.avatarUrl,
            },
          });
        } else {
          // 创建新用户
          user = await prisma.user.create({
            data: {
              email: profile.email,
              name: profile.name,
              avatarUrl: profile.avatarUrl,
              passwordHash: 'sso-auth',
              provider: profile.provider,
              providerId: profile.providerId,
            },
          });

          // 创建默认组织
          await prisma.organization.create({
            data: {
              name: `${profile.name} 的组织`,
              slug: `org-${user.id.substring(0, 8)}`,
              ownerId: user.id,
            },
          });
        }
      } catch (error: any) {
        // 处理竞态条件：并发请求同时创建用户
        if (error.code === 'P2002') {
          // 唯一约束冲突，重新查找用户
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { provider: profile.provider, providerId: profile.providerId },
                { email: profile.email },
              ],
            },
          });
          if (!user) {
            throw new Error('SSO 用户创建失败：并发冲突');
          }
        } else {
          throw error;
        }
      }
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 生成 JWT
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
}

export const ssoService = new SSOService();
