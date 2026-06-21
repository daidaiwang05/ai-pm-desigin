import app from './app';
import { config } from './config';

const PORT = config.port;
const HOST = config.host;

app.listen(PORT, HOST, () => {
  console.log(`
  ============================================
  🚀 AI Prototype API Server
  ============================================
  Environment: ${process.env.NODE_ENV || 'development'}
  Server:      http://${HOST}:${PORT}
  API:         http://${HOST}:${PORT}/api/v1
  Health:      http://${HOST}:${PORT}/health
  ============================================
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  process.exit(0);
});
