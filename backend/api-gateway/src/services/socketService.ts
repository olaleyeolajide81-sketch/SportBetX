import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { startOddsUpdateService } from './oddsService';

let stopOddsUpdates: (() => void) | null = null;

export function initializeSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    logger.info('Socket connected', { id: socket.id });

    socket.on('subscribe:event', (eventId: string) => {
      socket.join(`event:${eventId}`);
      logger.info('Socket subscribed to event', { id: socket.id, eventId });
    });

    socket.on('unsubscribe:event', (eventId: string) => {
      socket.leave(`event:${eventId}`);
      logger.info('Socket unsubscribed from event', { id: socket.id, eventId });
    });

    socket.on('subscribe:odds', () => {
      socket.join('odds:live');
      logger.info('Socket subscribed to live odds', { id: socket.id });
    });

    socket.on('unsubscribe:odds', () => {
      socket.leave('odds:live');
      logger.info('Socket unsubscribed from live odds', { id: socket.id });
    });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { id: socket.id });
    });
  });

  stopOddsUpdates = startOddsUpdateService(io);
}

export function stopSocketServices(): void {
  if (stopOddsUpdates) {
    stopOddsUpdates();
    stopOddsUpdates = null;
  }
}
