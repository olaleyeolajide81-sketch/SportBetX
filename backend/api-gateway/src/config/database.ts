import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

const DB_CONFIG = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'sportbetx',
  user: process.env.DATABASE_USER || 'sportbetx',
  password: process.env.DATABASE_PASSWORD || 'sportbetx123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export async function connectDatabase(): Promise<void> {
  pool = new Pool(DB_CONFIG);

  pool.on('error', (err) => {
    logger.error('Unexpected database pool error', { err: err.message });
  });

  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('Database connected successfully');
  } finally {
    client.release();
  }
}

export async function getClient(): Promise<PoolClient> {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return pool.connect();
}

export async function query(text: string, params?: unknown[]): Promise<unknown> {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  const result = await pool.query(text, params);
  return result.rows;
}

export async function isDatabaseConnected(): Promise<boolean> {
  if (!pool) return false;
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch {
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database disconnected');
  }
}
