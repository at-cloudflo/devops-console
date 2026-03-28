import 'dotenv/config';
import app from './app';
import { startBackgroundRefresh } from './services/refresh.service';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

const server = app.listen(PORT, () => {
  console.log(`\n  DevOps Console API`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Running:  http://localhost:${PORT}`);
  console.log(`  Env:      ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`  ─────────────────────────────────────\n`);

  // Start background data refresh after server is ready
  startBackgroundRefresh();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});

export default server;
