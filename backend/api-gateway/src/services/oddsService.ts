import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

interface OddsUpdate {
  eventId: string;
  odds: { home: number; away: number; draw: number };
  timestamp: number;
}

const INTERVAL_MS = 5000;

function generateRandomOdds(base: number): number {
  const variation = (Math.random() - 0.5) * 0.1;
  return Math.round(base * (1 + variation));
}

export function startOddsUpdateService(io: SocketIOServer): () => void {
  logger.info('Starting odds update service');

  const interval = setInterval(() => {
    io.emit('odds:update', {
      eventId: '1',
      odds: {
        home: generateRandomOdds(180),
        away: generateRandomOdds(200),
        draw: generateRandomOdds(350),
      },
      timestamp: Date.now(),
    } as OddsUpdate);

    io.emit('odds:update', {
      eventId: '2',
      odds: {
        home: generateRandomOdds(150),
        away: generateRandomOdds(250),
        draw: generateRandomOdds(300),
      },
      timestamp: Date.now(),
    } as OddsUpdate);
  }, INTERVAL_MS);

  return () => clearInterval(interval);
}
