import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { generateToken, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

export const authRoutes = Router();

interface StoredUser {
  address: string;
  username: string;
  role: 'user' | 'admin';
  createdAt: string;
}

const users = new Map<string, StoredUser>();

authRoutes.post(
  '/register',
  [
    body('address').isString().notEmpty().withMessage('Stellar address is required'),
    body('username').isString().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
    body('signature').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response) => {
    const { address, username, signature } = req.body as {
      address: string; username: string; signature?: string;
    };

    try {
      if (users.has(address)) {
        res.status(409).json({ error: 'Address already registered' });
        return;
      }

      const user: StoredUser = {
        address,
        username,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      users.set(address, user);

      const token = generateToken({ userId: address, address, role: user.role });

      logger.info('User registered', { address, username });
      res.status(201).json({
        data: { user: { address, username, role: user.role }, token },
      });
    } catch (err) {
      logger.error('Registration failed', { err });
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

authRoutes.post(
  '/login',
  [
    body('address').isString().notEmpty().withMessage('Stellar address is required'),
  ],
  validate,
  async (req: Request, res: Response) => {
    const { address } = req.body as { address: string };

    try {
      const user = users.get(address);
      if (!user) {
        res.status(404).json({ error: 'Address not registered. Please register first.' });
        return;
      }

      const token = generateToken({ userId: address, address, role: user.role });

      logger.info('User logged in', { address });
      res.json({
        data: { user: { address: user.address, username: user.username, role: user.role }, token },
      });
    } catch (err) {
      logger.error('Login failed', { err });
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

authRoutes.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = users.get(req.user!.address);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ data: { address: user.address, username: user.username, role: user.role } });
});
