import { Router, Request, Response } from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validate';
import { logger } from '../utils/logger';

export const searchRoutes = Router();

interface SearchResult {
  id: string;
  title: string;
  sport: string;
  status: string;
  homeTeam: string;
  awayTeam: string;
  startTime: number;
  odds: { home: number; away: number; draw: number };
  volume: number;
}

const mockEvents: SearchResult[] = [
  { id: '1', title: 'Lakers vs Celtics', sport: 'basketball', status: 'upcoming', homeTeam: 'Lakers', awayTeam: 'Celtics', startTime: Date.now() + 3600000, odds: { home: 180, away: 200, draw: 350 }, volume: 50000000 },
  { id: '2', title: 'Real Madrid vs Barcelona', sport: 'football', status: 'live', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', startTime: Date.now() + 7200000, odds: { home: 150, away: 250, draw: 300 }, volume: 75000000 },
  { id: '3', title: 'Warriors vs Nets', sport: 'basketball', status: 'upcoming', homeTeam: 'Warriors', awayTeam: 'Nets', startTime: Date.now() + 10800000, odds: { home: 190, away: 210, draw: 400 }, volume: 30000000 },
  { id: '4', title: 'Man City vs Liverpool', sport: 'football', status: 'upcoming', homeTeam: 'Man City', awayTeam: 'Liverpool', startTime: Date.now() + 14400000, odds: { home: 160, away: 240, draw: 280 }, volume: 60000000 },
  { id: '5', title: 'Djokovic vs Nadal', sport: 'tennis', status: 'live', homeTeam: 'Djokovic', awayTeam: 'Nadal', startTime: Date.now() + 18000000, odds: { home: 120, away: 320, draw: 500 }, volume: 20000000 },
  { id: '6', title: 'Yankees vs Red Sox', sport: 'baseball', status: 'upcoming', homeTeam: 'Yankees', awayTeam: 'Red Sox', startTime: Date.now() + 21600000, odds: { home: 170, away: 230, draw: 450 }, volume: 40000000 },
  { id: '7', title: 'Bulls vs Knicks', sport: 'basketball', status: 'upcoming', homeTeam: 'Bulls', awayTeam: 'Knicks', startTime: Date.now() + 25200000, odds: { home: 200, away: 180, draw: 380 }, volume: 25000000 },
  { id: '8', title: 'PSG vs Marseille', sport: 'football', status: 'finished', homeTeam: 'PSG', awayTeam: 'Marseille', startTime: Date.now() - 3600000, odds: { home: 140, away: 260, draw: 310 }, volume: 55000000 },
  { id: '9', title: 'Faker vs Chovy', sport: 'esports', status: 'upcoming', homeTeam: 'T1', awayTeam: 'GEN', startTime: Date.now() + 3600000, odds: { home: 160, away: 240, draw: 0 }, volume: 35000000 },
  { id: '10', title: 'Mavericks vs Spurs', sport: 'basketball', status: 'live', homeTeam: 'Mavericks', awayTeam: 'Spurs', startTime: Date.now() + 5400000, odds: { home: 210, away: 190, draw: 420 }, volume: 28000000 },
];

function searchEvents(term: string, sport?: string, status?: string): SearchResult[] {
  let results = [...mockEvents];

  if (term) {
    const lower = term.toLowerCase();
    results = results.filter(
      (e) =>
        e.title.toLowerCase().includes(lower) ||
        e.homeTeam.toLowerCase().includes(lower) ||
        e.awayTeam.toLowerCase().includes(lower) ||
        e.sport.toLowerCase().includes(lower)
    );
  }

  if (sport && sport !== 'all') {
    results = results.filter((e) => e.sport === sport);
  }

  if (status) {
    results = results.filter((e) => e.status === status);
  }

  return results;
}

searchRoutes.get(
  '/events',
  [
    query('q').optional().isString(),
    query('sport').optional().isString(),
    query('status').optional().isIn(['upcoming', 'live', 'finished']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  validate,
  async (req: Request, res: Response) => {
    const { q, sport, status, page = 1, pageSize = 20 } = req.query as {
      q?: string; sport?: string; status?: string; page?: number; pageSize?: number;
    };

    try {
      const results = searchEvents(q || '', sport, status);
      const total = results.length;
      const paged = results.slice((page - 1) * pageSize, page * pageSize);

      res.json({
        data: paged,
        pagination: { page, pageSize, total },
        query: { q: q || '', sport: sport || 'all', status: status || 'all' },
      });
    } catch (err) {
      logger.error('Search failed', { err });
      res.status(500).json({ error: 'Search failed' });
    }
  }
);
