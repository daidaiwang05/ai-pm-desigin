import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimit } from './middleware/rateLimit';

// ============================================
// Sentry Initialization
// ============================================
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

// Import routes
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/project/project.routes';
import iterationRoutes from './modules/iteration/iteration.routes';
import pageRoutes from './modules/page/page.routes';
import componentRoutes from './modules/component/component.routes';
import annotationRoutes from './modules/annotation/annotation.routes';
import snapshotRoutes from './modules/snapshot/snapshot.routes';
import previewRoutes from './modules/preview/preview.routes';
import exportRoutes from './modules/export/export.routes';
import verificationRoutes from './modules/verification/verification.routes';
import trashRoutes from './modules/trash/trash.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import designSystemRoutes from './modules/design-system/design-system.routes';

const app = express();

// ============================================
// Middleware
// ============================================

// CORS
const corsOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.APP_URL ? [process.env.APP_URL] : ['https://your-domain.com'])
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(apiRateLimit);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ============================================
// Health check
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// API Routes
// ============================================
const apiRouter = express.Router();

// Auth
apiRouter.use('/auth', authRoutes);

// Projects
apiRouter.use('/projects', projectRoutes);

// Iterations (nested under projects)
apiRouter.use('/', iterationRoutes);

// Pages (nested under iterations)
apiRouter.use('/', pageRoutes);

// Components (nested under pages)
apiRouter.use('/', componentRoutes);

// Annotations
apiRouter.use('/', annotationRoutes);

// Previews (必须在 Snapshots 之前，避免全局 auth 中间件影响)
apiRouter.use('/', previewRoutes);

// Snapshots
apiRouter.use('/', snapshotRoutes);

// Exports
apiRouter.use('/', exportRoutes);

// Verification (SMS)
apiRouter.use('/', verificationRoutes);

// Trash (回收站)
apiRouter.use('/', trashRoutes);

// Analytics (访客分析)
apiRouter.use('/', analyticsRoutes);

// Design System (设计规范)
apiRouter.use('/', designSystemRoutes);

// Mount API router
app.use('/api/v1', apiRouter);

// ============================================
// Error handling
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
