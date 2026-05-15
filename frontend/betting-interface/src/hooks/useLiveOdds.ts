import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useLiveOdds() {
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, (odds: { home: number; away: number; draw: number }) => void>>(new Map());

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
    socketRef.current = socket;

    socket.on('odds:update', (data: { eventId: string; odds: { home: number; away: number; draw: number }; timestamp: number }) => {
      const listener = listenersRef.current.get(data.eventId);
      if (listener) {
        listener(data.odds);
      }
    });

    socket.on('connect', () => {
      socket.emit('subscribe:odds');
    });

    return () => {
      socket.emit('unsubscribe:odds');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const subscribe = useCallback((eventId: string, callback: (odds: { home: number; away: number; draw: number }) => void) => {
    listenersRef.current.set(eventId, callback);
  }, []);

  const unsubscribe = useCallback((eventId: string) => {
    listenersRef.current.delete(eventId);
  }, []);

  return { subscribe, unsubscribe };
}
