import { io, Socket } from 'socket.io-client';
import { QueryClient } from '@tanstack/react-query';

let socket: Socket | null = null;

export function initSocketClient(queryClient: QueryClient): Socket {
  if (socket) return socket;

  const serverUrl = import.meta.env.VITE_API_URL || window.location.origin;

  socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('⚡ Connected to real-time Socket.io server (ID:', socket?.id, ')');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected from Socket.io server:', reason);
  });

  // Listen for real-time slot bookings and cancellations from ANY connected client
  socket.on('slot:updated', (payload: { slotId: string; status: string; slot?: any }) => {
    console.log('📢 Real-time slot update received:', payload);
    
    // Invalidate slot queries to update UI in real-time without user refresh
    queryClient.invalidateQueries({ queryKey: ['slots'] });
    queryClient.invalidateQueries({ queryKey: ['available-dates'] });
    queryClient.invalidateQueries({ queryKey: ['user-appointments'] });
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}
