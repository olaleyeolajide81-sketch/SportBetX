import { logger } from '../utils/logger';

interface GamblingLimit {
  dailyLossLimit: number;
  weeklyLossLimit: number;
  monthlyDepositLimit: number;
  maxBetAmount: number;
  cooldownMinutes: number;
}

interface SelfExclusion {
  active: boolean;
  startDate: number;
  endDate: number;
  reason?: string;
}

interface BettingSession {
  date: string;
  bets: { amount: number; won: number }[];
}

const userLimits = new Map<string, GamblingLimit>();
const userExclusions = new Map<string, SelfExclusion>();
const userSessions = new Map<string, BettingSession[]>();

const DEFAULT_LIMITS: GamblingLimit = {
  dailyLossLimit: 10000,
  weeklyLossLimit: 50000,
  monthlyDepositLimit: 200000,
  maxBetAmount: 5000,
  cooldownMinutes: 0,
};

export function getUserLimits(userId: string): GamblingLimit {
  return userLimits.get(userId) || { ...DEFAULT_LIMITS };
}

export function setUserLimits(userId: string, limits: Partial<GamblingLimit>): void {
  const current = getUserLimits(userId);
  userLimits.set(userId, { ...current, ...limits });
  logger.info('Gambling limits updated', { userId });
}

export function getSelfExclusion(userId: string): SelfExclusion | null {
  return userExclusions.get(userId) || null;
}

export function setSelfExclusion(
  userId: string,
  days: number,
  reason?: string
): SelfExclusion {
  const exclusion: SelfExclusion = {
    active: true,
    startDate: Date.now(),
    endDate: Date.now() + days * 86400000,
    reason,
  };
  userExclusions.set(userId, exclusion);
  logger.info('Self-exclusion set', { userId, days });
  return exclusion;
}

export function cancelSelfExclusion(userId: string): void {
  userExclusions.delete(userId);
  logger.info('Self-exclusion cancelled', { userId });
}

export function isExcluded(userId: string): boolean {
  const exclusion = userExclusions.get(userId);
  if (!exclusion) return false;
  if (Date.now() > exclusion.endDate) {
    userExclusions.delete(userId);
    return false;
  }
  return true;
}

export function recordBet(userId: string, amount: number): void {
  const today = new Date().toISOString().slice(0, 10);
  const sessions = userSessions.get(userId) || [];
  let todaySession = sessions.find((s) => s.date === today);
  if (!todaySession) {
    todaySession = { date: today, bets: [] };
    sessions.push(todaySession);
  }
  todaySession.bets.push({ amount, won: 0 });
  userSessions.set(userId, sessions);
}

export function checkBetAllowed(userId: string, amount: number): { allowed: boolean; reason?: string } {
  if (isExcluded(userId)) {
    return { allowed: false, reason: 'You are currently self-excluded from betting.' };
  }

  const limits = getUserLimits(userId);

  if (amount > limits.maxBetAmount) {
    return { allowed: false, reason: `Maximum bet amount is ${limits.maxBetAmount} XLM.` };
  }

  const today = new Date().toISOString().slice(0, 10);
  const sessions = userSessions.get(userId) || [];
  const todaySession = sessions.find((s) => s.date === today);
  if (todaySession) {
    const dailyLoss = todaySession.bets.reduce((sum, b) => sum + b.amount, 0);
    if (dailyLoss + amount > limits.dailyLossLimit) {
      return { allowed: false, reason: `Daily loss limit of ${limits.dailyLossLimit} XLM reached.` };
    }
  }

  const thisWeek = getWeekRange();
  const weekSessions = sessions.filter((s) => s.date >= thisWeek.start && s.date <= thisWeek.end);
  const weeklyLoss = weekSessions.reduce((sum, s) => sum + s.bets.reduce((bSum, b) => bSum + b.amount, 0), 0);
  if (weeklyLoss + amount > limits.weeklyLossLimit) {
    return { allowed: false, reason: `Weekly loss limit of ${limits.weeklyLossLimit} XLM reached.` };
  }

  return { allowed: true };
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
