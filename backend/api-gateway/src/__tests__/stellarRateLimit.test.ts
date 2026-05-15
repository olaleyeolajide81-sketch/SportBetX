import { Request, Response, NextFunction } from 'express';

// Mock the redis module before importing the middleware
const mockIncr = jest.fn();
const mockExpire = jest.fn();
const mockTtl = jest.fn();
const mockGetRedisClient = jest.fn();

jest.mock('../config/redis', () => ({
  getRedisClient: mockGetRedisClient,
}));

// Import after mocking
import { stellarRateLimit } from '../middleware/stellarRateLimit';

const VALID_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

function makeReq(body: Record<string, unknown> = {}): Request {
  return { body } as unknown as Request;
}

function makeRes() {
  const json = jest.fn();
  const setHeader = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json, setHeader } as unknown as Response;
  return { res, status, json, setHeader };
}

describe('stellarRateLimit middleware', () => {
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
    mockExpire.mockResolvedValue(1);
    mockTtl.mockResolvedValue(45);
    mockGetRedisClient.mockReturnValue({
      isReady: true,
      incr: mockIncr,
      expire: mockExpire,
      ttl: mockTtl,
    });
  });

  it('calls next() when no stellarAddress in body', async () => {
    const req = makeReq({});
    const { res } = makeRes();
    await stellarRateLimit(req, res, next as unknown as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next() when Redis is unavailable', async () => {
    mockGetRedisClient.mockReturnValue(null);
    const req = makeReq({ stellarAddress: VALID_ADDRESS });
    const { res } = makeRes();
    await stellarRateLimit(req, res, next as unknown as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next() when Redis client is not ready', async () => {
    mockGetRedisClient.mockReturnValue({ isReady: false });
    const req = makeReq({ stellarAddress: VALID_ADDRESS });
    const { res } = makeRes();
    await stellarRateLimit(req, res, next as unknown as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows requests under the limit', async () => {
    mockIncr.mockResolvedValue(5);
    const req = makeReq({ stellarAddress: VALID_ADDRESS });
    const { res } = makeRes();
    await stellarRateLimit(req, res, next as unknown as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows exactly 10 bets (boundary)', async () => {
    mockIncr.mockResolvedValue(10);
    const req = makeReq({ stellarAddress: VALID_ADDRESS });
    const { res } = makeRes();
    await stellarRateLimit(req, res, next as unknown as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 429 on the 11th bet', async () => {
    mockIncr.mockResolvedValue(11);
    const req = makeReq({ stellarAddress: VALID_ADDRESS });
    const { res, status, setHeader } = makeRes();
    await stellarRateLimit(req, res, next as unknown as NextFunction);
    expect(next).not.toHaveBeenCalled();
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '45');
    expect(status).toHaveBeenCalledWith(429);
  });

  it('sets expire only on first request (count === 1)', async () => {
    mockIncr.mockResolvedValue(1);
    const req = makeReq({ stellarAddress: VALID_ADDRESS });
    const { res } = makeRes();
    await stellarRateLimit(req, res, next as unknown as NextFunction);
    expect(mockExpire).toHaveBeenCalledWith(`ratelimit:bet:${VALID_ADDRESS}`, 60);
  });

  it('does not set expire on subsequent requests', async () => {
    mockIncr.mockResolvedValue(3);
    const req = makeReq({ stellarAddress: VALID_ADDRESS });
    const { res } = makeRes();
    await stellarRateLimit(req, res, next as unknown as NextFunction);
    expect(mockExpire).not.toHaveBeenCalled();
  });

  it('calls next() when Redis throws an error', async () => {
    mockIncr.mockRejectedValue(new Error('Redis connection lost'));
    const req = makeReq({ stellarAddress: VALID_ADDRESS });
    const { res } = makeRes();
    await stellarRateLimit(req, res, next as unknown as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
