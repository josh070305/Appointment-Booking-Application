import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './utils/logger.js';

let io: SocketIOServer | null = null;

export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Real-time client connected via Socket.io');

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Client disconnected from Socket.io');
    });
  });

  return io;
}

export function broadcastSlotUpdate(slotId: string, status: 'AVAILABLE' | 'BOOKED', slotData?: any): void {
  if (io) {
    logger.info({ slotId, status }, '📢 Broadcasting real-time slot update to all connected clients');
    io.emit('slot:updated', {
      slotId,
      status,
      slot: slotData,
      timestamp: new Date().toISOString()
    });
  }
}

export function getIO(): SocketIOServer | null {
  return io;
}
