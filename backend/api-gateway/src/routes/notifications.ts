import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { addSubscription, removeSubscription, getVapidPublicKey } from '../services/notificationService';
import { logger } from '../utils/logger';

export const notificationRoutes = Router();

notificationRoutes.get('/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ data: { publicKey: getVapidPublicKey() } });
});

notificationRoutes.post(
  '/subscribe',
  authMiddleware,
  [
    body('endpoint').isString().notEmpty().withMessage('endpoint is required'),
    body('keys.p256dh').isString().notEmpty().withMessage('p256dh key is required'),
    body('keys.auth').isString().notEmpty().withMessage('auth key is required'),
  ],
  validate,
  (req: Request, res: Response) => {
    const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };
    try {
      addSubscription(req.user!.userId, { endpoint, keys });
      res.status(201).json({ data: { status: 'subscribed' } });
    } catch (err) {
      logger.error('Failed to subscribe', { err });
      res.status(500).json({ error: 'Failed to subscribe to notifications' });
    }
  }
);

notificationRoutes.post(
  '/unsubscribe',
  authMiddleware,
  [body('endpoint').isString().notEmpty().withMessage('endpoint is required')],
  validate,
  (req: Request, res: Response) => {
    const { endpoint } = req.body as { endpoint: string };
    try {
      removeSubscription(req.user!.userId, endpoint);
      res.json({ data: { status: 'unsubscribed' } });
    } catch (err) {
      logger.error('Failed to unsubscribe', { err });
      res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  }
);
