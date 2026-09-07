import http from 'http';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { autoSeedIfEmpty } from './scripts/seed.js';
import { initSocket, getIO } from './socket.js';
import { logger } from './utils/logger.js';

const PORT = ENV.PORT;

async function startServer() {
  // Validate required environment variables
  if (!ENV.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }
  if (!ENV.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  try {
    await connectDB();

    // Auto-seed if database has no slots
    await autoSeedIfEmpty();

    const httpServer = http.createServer(app);
    const io = initSocket(httpServer);

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Appointment Booking API server running on http://localhost:${PORT}`);
      logger.info(`📡 Environment: ${ENV.NODE_ENV}`);
      logger.info(`⚡ Socket.io Real-Time Synchronization: Active`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      httpServer.close(async (err) => {
        if (err) {
          logger.error({ err }, 'Error closing HTTP server');
          process.exit(1);
        } else {
          logger.info('HTTP server closed');
          // Close Socket.io connections
          getIO()?.close();
          await disconnectDB();
          logger.info('Database connection closed');
          process.exit(0);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error({ err: error }, 'Fatal error starting server');
    process.exit(1);
  }
}

startServer();