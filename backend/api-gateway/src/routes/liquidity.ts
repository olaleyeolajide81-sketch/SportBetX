import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { stellarAddressRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

export const liquidityRoutes = Router();

liquidityRoutes.get('/pools', (_req: Request, res: Response) => {
  res.json({
    data: [
      { id: 'pool-1', sport: 'football', totalLiquidity: 1000000, apy: 12.5 },
      { id: 'pool-2', sport: 'basketball', totalLiquidity: 500000, apy: 10.2 },
    ],
  });
});

// POST /api/v1/liquidity/deposit - with validation (issue #18)
liquidityRoutes.post(
  '/deposit',
  [
    body('poolId').isString().notEmpty().withMessage('poolId is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  ],
  validate,
  stellarAddressRateLimiter,
  async (req: Request, res: Response) => {
    const { poolId, amount } = req.body as { poolId: string; amount: number };
    try {
      // TODO: submit to Stellar smart contract
      logger.info('Liquidity deposit', { poolId, amount });
      res.status(201).json({
        data: { poolId, amount, status: 'pending', createdAt: new Date().toISOString() },
      });
    } catch (err) {
      logger.error('Failed to deposit liquidity', { err });
      res.status(500).json({ error: 'Failed to deposit liquidity' });
    }
  }
);
