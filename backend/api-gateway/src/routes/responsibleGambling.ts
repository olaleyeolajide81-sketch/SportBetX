import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import {
  getUserLimits,
  setUserLimits,
  getSelfExclusion,
  setSelfExclusion,
  cancelSelfExclusion,
} from '../services/responsibleGamblingService';
import { logger } from '../utils/logger';

export const responsibleGamblingRoutes = Router();

responsibleGamblingRoutes.get('/limits', authMiddleware, (req: Request, res: Response) => {
  const limits = getUserLimits(req.user!.userId);
  res.json({ data: limits });
});

responsibleGamblingRoutes.put(
  '/limits',
  authMiddleware,
  [
    body('dailyLossLimit').optional().isInt({ min: 0 }),
    body('weeklyLossLimit').optional().isInt({ min: 0 }),
    body('monthlyDepositLimit').optional().isInt({ min: 0 }),
    body('maxBetAmount').optional().isInt({ min: 0 }),
    body('cooldownMinutes').optional().isInt({ min: 0 }),
  ],
  validate,
  (req: Request, res: Response) => {
    const limits = req.body as Partial<{
      dailyLossLimit: number;
      weeklyLossLimit: number;
      monthlyDepositLimit: number;
      maxBetAmount: number;
      cooldownMinutes: number;
    }>;
    try {
      setUserLimits(req.user!.userId, limits);
      res.json({ data: { status: 'limits_updated' } });
    } catch (err) {
      logger.error('Failed to update limits', { err });
      res.status(500).json({ error: 'Failed to update gambling limits' });
    }
  }
);

responsibleGamblingRoutes.post(
  '/exclude',
  authMiddleware,
  [
    body('days').isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
    body('reason').optional().isString(),
  ],
  validate,
  (req: Request, res: Response) => {
    const { days, reason } = req.body as { days: number; reason?: string };
    try {
      const exclusion = setSelfExclusion(req.user!.userId, days, reason);
      res.json({ data: exclusion });
    } catch (err) {
      logger.error('Failed to set exclusion', { err });
      res.status(500).json({ error: 'Failed to set self-exclusion' });
    }
  }
);

responsibleGamblingRoutes.post('/cancel-exclusion', authMiddleware, (req: Request, res: Response) => {
  try {
    cancelSelfExclusion(req.user!.userId);
    res.json({ data: { status: 'exclusion_cancelled' } });
  } catch (err) {
    logger.error('Failed to cancel exclusion', { err });
    res.status(500).json({ error: 'Failed to cancel self-exclusion' });
  }
});

responsibleGamblingRoutes.get('/exclusion', authMiddleware, (req: Request, res: Response) => {
  const exclusion = getSelfExclusion(req.user!.userId);
  res.json({ data: exclusion || { active: false } });
});
