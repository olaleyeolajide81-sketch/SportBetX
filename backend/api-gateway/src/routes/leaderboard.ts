import { Router, Request, Response } from 'express';
import { getRedisClient } from '../config/redis';
import { getDbClient } from '../config/database';
import { logger } from '../utils/logger';

export const leaderboardRoutes = Router();

type LeaderboardType = 'profit' | 'winrate' | 'liquidity';
type LeaderboardPeriod = '24h' | '7d' | '30d' | 'all';

const CACHE_TTL = 300; // 5 minutes

function periodToInterval(period: LeaderboardPeriod): string | null {
  switch (period) {
    case '24h': return '1 day';
    case '7d':  return '7 days';
    case '30d': return '30 days';
    case 'all': return null;
  }
}

/**
 * GET /api/v1/leaderboard
 * Query params:
 *   type    = profit | winrate | liquidity  (default: profit)
 *   period  = 24h | 7d | 30d | all         (default: 7d)
 *   limit   = number                        (default: 50, max: 100)
 */
leaderboardRoutes.get('/', async (req: Request, res: Response) => {
  const type: LeaderboardType = (['profit', 'winrate', 'liquidity'].includes(req.query.type as string)
    ? req.query.type
    : 'profit') as LeaderboardType;

  const period: LeaderboardPeriod = (['24h', '7d', '30d', 'all'].includes(req.query.period as string)
    ? req.query.period
    : '7d') as LeaderboardPeriod;

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  const cacheKey = `leaderboard:${type}:${period}:${limit}`;

  try {
    const redis = getRedisClient();

    // Serve from cache if available
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ data: JSON.parse(cached), cached: true });
    }

    const db = getDbClient();
    const interval = periodToInterval(period);
    const whereClause = interval ? `WHERE b.created_at >= NOW() - INTERVAL '${interval}'` : '';

    let rows: any[];

    if (type === 'liquidity') {
      const result = await db.query(`
        SELECT
          lp.user_address,
          SUM(lp.amount) AS total_liquidity,
          RANK() OVER (ORDER BY SUM(lp.amount) DESC) AS rank
        FROM liquidity_positions lp
        ${interval ? `WHERE lp.created_at >= NOW() - INTERVAL '${interval}'` : ''}
        GROUP BY lp.user_address
        ORDER BY total_liquidity DESC
        LIMIT $1
      `, [limit]);
      rows = result.rows;
    } else if (type === 'winrate') {
      const result = await db.query(`
        SELECT
          b.user_address,
          COUNT(*) FILTER (WHERE b.outcome = 'won') AS wins,
          COUNT(*) AS total_bets,
          ROUND(
            COUNT(*) FILTER (WHERE b.outcome = 'won') * 100.0 / NULLIF(COUNT(*), 0), 2
          ) AS win_rate,
          RANK() OVER (ORDER BY
            COUNT(*) FILTER (WHERE b.outcome = 'won') * 100.0 / NULLIF(COUNT(*), 0) DESC
          ) AS rank
        FROM bets b
        ${whereClause}
        GROUP BY b.user_address
        HAVING COUNT(*) >= 5
        ORDER BY win_rate DESC
        LIMIT $1
      `, [limit]);
      rows = result.rows;
    } else {
      // profit
      const result = await db.query(`
        SELECT
          b.user_address,
          SUM(b.payout - b.amount) AS net_profit,
          RANK() OVER (ORDER BY SUM(b.payout - b.amount) DESC) AS rank
        FROM bets b
        ${whereClause}
        GROUP BY b.user_address
        ORDER BY net_profit DESC
        LIMIT $1
      `, [limit]);
      rows = result.rows;
    }

    await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(rows));
    return res.json({ data: rows, cached: false });
  } catch (error) {
    logger.error('Leaderboard query failed:', error);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});
