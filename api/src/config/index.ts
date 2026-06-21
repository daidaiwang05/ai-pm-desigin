import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.API_PORT || '4000', 10),
  host: process.env.API_HOST || '0.0.0.0',
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-dev-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/proto',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  ai: {
    engineUrl: process.env.AI_ENGINE_URL || 'http://localhost:8000',
  },
};
