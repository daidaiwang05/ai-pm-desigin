import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

// JWT_SECRET 在生产环境必须设置，开发环境使用随机生成的临时密钥
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET 环境变量必须在生产环境中设置！');
}
const jwtSecret = JWT_SECRET || crypto.randomBytes(32).toString('hex');

export const config = {
  port: parseInt(process.env.API_PORT || '4000', 10),
  host: process.env.API_HOST || '0.0.0.0',
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/proto',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  ai: {
    engineUrl: process.env.AI_ENGINE_URL || 'http://localhost:8001',
  },
};
