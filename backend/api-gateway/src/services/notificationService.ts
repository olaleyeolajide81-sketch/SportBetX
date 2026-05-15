import webpush from 'web-push';
import { logger } from '../utils/logger';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BIP7GymXv1QM_JwVRxY_jNRhj8V5xKSmPl5-SZDfjPQ9GxnFtvrFA82z_ujiKs1N_0tqQ2FqQh7JRN4zX2tVs24';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'mock-private-key-change-in-production';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sportbetx.io';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const subscriptions = new Map<string, PushSubscription[]>();

export function addSubscription(userId: string, sub: PushSubscription): void {
  const userSubs = subscriptions.get(userId) || [];
  const exists = userSubs.some((s) => s.endpoint === sub.endpoint);
  if (!exists) {
    userSubs.push(sub);
    subscriptions.set(userId, userSubs);
    logger.info('Push subscription added', { userId });
  }
}

export function removeSubscription(userId: string, endpoint: string): void {
  const userSubs = subscriptions.get(userId);
  if (userSubs) {
    subscriptions.set(
      userId,
      userSubs.filter((s) => s.endpoint !== endpoint)
    );
    logger.info('Push subscription removed', { userId });
  }
}

export async function sendNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const userSubs = subscriptions.get(userId);
  if (!userSubs || userSubs.length === 0) return;

  const payload = JSON.stringify({ title, body, data, timestamp: Date.now() });

  for (const sub of userSubs) {
    try {
      await webpush.sendNotification(sub as webpush.PushSubscription, payload);
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 410) {
        removeSubscription(userId, sub.endpoint);
      }
      logger.warn('Failed to send push notification', {
        userId,
        error: (err as Error).message,
      });
    }
  }
}

export async function notifyBetSettled(
  userId: string,
  betId: string,
  eventTitle: string,
  status: string,
  payout: number
): Promise<void> {
  const title = status === 'won' ? '🎉 Bet Won!' : '💔 Bet Lost';
  const body =
    status === 'won'
      ? `Your bet on "${eventTitle}" won! Payout: ${payout} XLM`
      : `Your bet on "${eventTitle}" was not successful.`;

  await sendNotification(userId, title, body, { type: 'bet_settled', betId, payout });
}

export async function notifyOddsChanged(
  userIds: string[],
  eventId: string,
  eventTitle: string,
  odds: Record<string, number>
): Promise<void> {
  const title = '📊 Odds Updated';
  const body = `Odds have changed for "${eventTitle}". Check the latest odds now.`;

  for (const userId of userIds) {
    await sendNotification(userId, title, body, {
      type: 'odds_changed',
      eventId,
      odds,
    });
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
