import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

const MAX_BETS = 10;
const WINDOW_SECONDS = 60;

// Stellar addresses exempt from per-address rate limiting
const ADMIN_ADDRESSES = new Set(
  (process.env.ADMIN_STELLAR_ADDRESSES || '').split(',').filter(Boolean)
);

/**
 * Per-Stellar-address rate limiter for bet placement.
 * Expects req.body.stellarAddress to be set by the caller.
 * Limits each address to MAX_BETS bets per WINDOW_SECONDS.
 * Falls back gracefully when Redis is unavailable.
 */
export async function stellarRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const address: string | undefined = req.body?.stellarAddress;

  if (!address) {
    // No address provided — let validation middleware handle it
    return next();
  }

  if (ADMIN_ADDRESSES.has(address)) {
    return next();
  }

  const redis = getRedisClient();
  if (!redis || !redis.isReady) {
    // Redis unavailable — degrade gracefully, allow request
    logger.warn('stellarRateLimit: Redis unavailable, skipping rate limit check', { address });
    return next();
  }

  const key = `ratelimit:bet:${address}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      // First request in window — set expiry
      await redis.expire(key, WINDOW_SECONDS);
    }

    if (count > MAX_BETS) {
      const ttl = await redis.ttl(key);
      res.setHeader('Retry-After', String(ttl > 0 ? ttl : WINDOW_SECONDS));
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded: max ${MAX_BETS} bets per ${WINDOW_SECONDS}s per address.`,
        retryAfter: ttl > 0 ? ttl : WINDOW_SECONDS,
      });
      return;
    }
  } catch (err) {
    logger.warn('stellarRateLimit: Redis error, skipping rate limit check', { address, err });
  }

  next();
}
