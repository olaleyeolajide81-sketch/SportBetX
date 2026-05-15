import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { stellarRateLimit } from '../middleware/stellarRateLimit';
import { getOrSet, invalidateKey } from '../config/redis';
import { logger } from '../utils/logger';

export const bettingRoutes = Router();

const EVENTS_TTL = 30; // seconds (issue #15)
const ODDS_TTL = 5;    // seconds (issue #15)

// GET /api/v1/betting/events - cached 30s, supports ?search= query param
bettingRoutes.get(
  '/events',
  [query('search').optional().isString().trim()],
  validate,
  async (req: Request, res: Response) => {
    const search = (req.query.search as string | undefined)?.toLowerCase() ?? '';
    try {
      const allEvents = await getOrSet('events:all', EVENTS_TTL, async () => {
        // TODO: replace with real DB query
        return [
          { id: '1', title: 'Lakers vs Celtics', sport: 'basketball', status: 'upcoming' },
          { id: '2', title: 'Real Madrid vs Barcelona', sport: 'football', status: 'live' },
          { id: '3', title: 'Federer vs Nadal', sport: 'tennis', status: 'upcoming' },
          { id: '4', title: 'Chiefs vs Eagles', sport: 'football', status: 'upcoming' },
        ];
      });
      const events = search
        ? allEvents.filter((e: { title: string }) => e.title.toLowerCase().includes(search))
        : allEvents;
      res.json({ data: events });
    } catch (err) {
      logger.error('Failed to fetch events', { err });
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }
);

// GET /api/v1/betting/events/:eventId/odds - cached 5s
bettingRoutes.get('/events/:eventId/odds', async (req: Request, res: Response) => {
  const { eventId } = req.params;
  try {
    const odds = await getOrSet(`odds:${eventId}`, ODDS_TTL, async () => {
      // TODO: replace with real DB query
      return { home: 180, away: 200, draw: 350 };
    });
    res.json({ data: odds });
  } catch (err) {
    logger.error('Failed to fetch odds', { err, eventId });
    res.status(500).json({ error: 'Failed to fetch odds' });
  }
});

// GET /api/v1/betting/:address/history
bettingRoutes.get(
  '/:address/history',
  [
    param('address').isString().notEmpty().withMessage('address is required'),
    query('status').optional().isIn(['pending', 'won', 'lost']).withMessage('status must be pending, won, or lost'),
    query('sport').optional().isString(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  async (req: Request, res: Response) => {
    const { address } = req.params;
    const { status, sport, page = 1, pageSize = 20 } = req.query as {
      status?: string; sport?: string; page?: number; pageSize?: number;
    };

    try {
      // TODO: replace with real DB query
      const mockBets = Array.from({ length: 5 }, (_, i) => ({
        id: `bet-${i + 1}`,
        address,
        eventId: `event-${i + 1}`,
        eventTitle: `Event ${i + 1}`,
        sport: sport || 'football',
        selection: 'home',
        amount: 100,
        odds: 180,
        status: status || ['pending', 'won', 'lost'][i % 3],
        payout: i % 3 === 1 ? 180 : 0,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      }));

      const totalStaked = mockBets.reduce((s, b) => s + b.amount, 0);
      const totalWon = mockBets.reduce((s, b) => s + b.payout, 0);

      res.json({
        data: mockBets,
        pagination: { page, pageSize, total: mockBets.length },
        summary: {
          totalStaked,
          totalWon,
          roi: totalStaked > 0 ? ((totalWon - totalStaked) / totalStaked) * 100 : 0,
        },
      });
    } catch (err) {
      logger.error('Failed to fetch bet history', { err, address });
      res.status(500).json({ error: 'Failed to fetch bet history' });
    }
  }
);

// POST /api/v1/betting/place - with validation (issue #18) and per-address rate limiting (issue #27)
bettingRoutes.post(
  '/place',
  [
    body('stellarAddress')
      .isString()
      .notEmpty()
      .matches(/^G[A-Z2-7]{55}$/)
      .withMessage('stellarAddress must be a valid Stellar public key'),
    body('eventId').isUUID().withMessage('eventId must be a valid UUID'),
    body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
    body('selection').isIn(['home', 'away', 'draw']).withMessage('selection must be home, away, or draw'),
  ],
  validate,
  stellarRateLimit,
  async (req: Request, res: Response) => {
    const { stellarAddress, eventId, amount, selection } = req.body as {
      stellarAddress: string; eventId: string; amount: number; selection: string;
    };

    try {
      // Invalidate odds cache on new bet (issue #15)
      await invalidateKey(`odds:${eventId}`);

      // TODO: submit to Stellar smart contract
      const bet = {
        id: `bet-${Date.now()}`,
        stellarAddress,
        eventId,
        amount,
        selection,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      logger.info('Bet placed', { bet });
      res.status(201).json({ data: bet });
    } catch (err) {
      logger.error('Failed to place bet', { err });
      res.status(500).json({ error: 'Failed to place bet' });
    }
  }
);
