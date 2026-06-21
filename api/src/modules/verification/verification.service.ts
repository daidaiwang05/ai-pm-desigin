import { prisma } from '../../utils/prisma';
import { randomInt } from 'crypto';

// 短信服务提供商配置
interface SmsConfig {
  provider: 'aliyun' | 'twilio' | 'mock';
  accessKeyId?: string;
  accessKeySecret?: string;
  signName?: string;
  templateCode?: string;
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export class VerificationService {
  private config: SmsConfig;

  constructor() {
    this.config = {
      provider: (process.env.SMS_PROVIDER as any) || 'mock',
      accessKeyId: process.env.SMS_ACCESS_KEY_ID,
      accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET,
      signName: process.env.SMS_SIGN_NAME || 'AI Prototype',
      templateCode: process.env.SMS_TEMPLATE_CODE,
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
    };
  }

  /**
   * 发送验证码
   */
  async sendCode(phone: string, purpose: 'login' | 'comment' = 'login') {
    // 检查发送频率限制
    const recentCode = await prisma.verificationCode.findFirst({
      where: {
        phone,
        purpose,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // 1 分钟内
        },
      },
    });

    if (recentCode) {
      throw new Error('发送过于频繁，请稍后再试');
    }

    // 生成 6 位验证码
    const code = randomInt(100000, 999999).toString();

    // 先发送短信，成功后再存储验证码
    // 这样如果短信发送失败，用户不会被 rate-limit
    await this.sendSms(phone, code);

    // 短信发送成功后才存储验证码
    await prisma.verificationCode.create({
      data: {
        phone,
        code,
        purpose,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 分钟过期
      },
    });

    return {
      message: '验证码已发送',
      expiresIn: 300, // 5 分钟
    };
  }

  /**
   * 验证验证码
   */
  async verifyCode(phone: string, code: string, purpose: 'login' | 'comment' = 'login') {
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        phone,
        code,
        purpose,
        expiresAt: {
          gte: new Date(),
        },
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verificationCode) {
      throw new Error('验证码无效或已过期');
    }

    // 标记为已使用
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true },
    });

    return true;
  }

  /**
   * 发送短信
   */
  private async sendSms(phone: string, code: string) {
    const message = `【${this.config.signName}】您的验证码是：${code}，5分钟内有效。`;

    switch (this.config.provider) {
      case 'aliyun':
        await this.sendViaAliyun(phone, code);
        break;
      case 'twilio':
        await this.sendViaTwilio(phone, message);
        break;
      case 'mock':
      default:
        // Mock 模式：打印醒目的开发日志
        console.log('\n' + '='.repeat(50));
        console.log('📱 [Mock SMS] 验证码发送');
        console.log('='.repeat(50));
        console.log(`📞 手机号: ${phone}`);
        console.log(`🔑 验证码: ${code}`);
        console.log(`💬 消息: ${message}`);
        console.log('='.repeat(50) + '\n');
        break;
    }
  }

  /**
   * 阿里云短信
   */
  private async sendViaAliyun(phone: string, code: string) {
    // 阿里云短信 API 调用
    // 实际实现需要使用 @alicloud/dysmsapi20170525 SDK
    console.log(`[Aliyun SMS] To: ${phone}, Code: ${code}`);

    // 如果配置了阿里云凭证，尝试调用 API
    if (this.config.accessKeyId && this.config.accessKeySecret) {
      try {
        // 这里可以集成阿里云 SMS SDK
        // const client = new DysmsapiClient({...});
        // await client.sendSms({...});
        console.log('[Aliyun SMS] SDK not implemented, using mock fallback');
      } catch (error) {
        console.error('[Aliyun SMS] Failed:', error);
        throw new Error('短信发送失败');
      }
    }
  }

  /**
   * Twilio 短信
   */
  private async sendViaTwilio(phone: string, message: string) {
    if (!this.config.accountSid || !this.config.authToken) {
      throw new Error('Twilio 配置不完整');
    }

    // Twilio API 调用
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(
            `${this.config.accountSid}:${this.config.authToken}`
          ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: this.config.fromNumber || '',
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('短信发送失败');
    }
  }

  /**
   * 手机号登录/注册
   */
  async phoneLogin(phone: string, code: string) {
    // 验证验证码
    await this.verifyCode(phone, code, 'login');

    // 查找或创建用户
    let user = await prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      // 创建新用户
      user = await prisma.user.create({
        data: {
          phone,
          email: `${phone}@phone.temp`,
          name: `用户${phone.slice(-4)}`,
          passwordHash: 'phone-auth', // 手机号登录不需要密码
          provider: 'phone',
          providerId: phone,
        },
      });

      // 创建默认组织
      await prisma.organization.create({
        data: {
          name: `${user.name} 的组织`,
          slug: `org-${user.id.substring(0, 8)}`,
          ownerId: user.id,
        },
      });
    }

    return user;
  }
}

export const verificationService = new VerificationService();
