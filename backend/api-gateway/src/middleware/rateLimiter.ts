import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stellarLimiterStore = new Map<string, RateLimitEntry>();
const BET_WINDOW_MS = 60 * 1000;
const BET_MAX_REQUESTS = 10;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of stellarLimiterStore) {
    if (entry.resetAt < now) {
      stellarLimiterStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export function stellarAddressRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const address = req.headers['x-stellar-address'] as string || req.body?.address;
  if (!address) {
    next();
    return;
  }

  const now = Date.now();
  const key = `stellar:${address}:${req.path}`;
  const entry = stellarLimiterStore.get(key);

  if (!entry || entry.resetAt < now) {
    stellarLimiterStore.set(key, { count: 1, resetAt: now + BET_WINDOW_MS });
    const remaining = BET_MAX_REQUESTS - 1;
    res.set('X-RateLimit-Limit', String(BET_MAX_REQUESTS));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(Math.ceil((now + BET_WINDOW_MS) / 1000)));
    next();
    return;
  }

  entry.count += 1;

  const remaining = Math.max(0, BET_MAX_REQUESTS - entry.count);
  res.set('X-RateLimit-Limit', String(BET_MAX_REQUESTS));
  res.set('X-RateLimit-Remaining', String(remaining));
  res.set('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > BET_MAX_REQUESTS) {
    logger.warn('Stellar address rate limit exceeded', { address, path: req.path });
    res.status(429).json({
      error: 'RateLimitExceeded',
      message: `Too many requests from this address. Limit: ${BET_MAX_REQUESTS} per ${BET_WINDOW_MS / 1000}s`,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }

  next();
}
