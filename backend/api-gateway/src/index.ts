import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import client from 'prom-client';

import { errorHandler } from './middleware/errorHandler';
import { stellarErrorMiddleware } from './middleware/stellarErrorHandler';
import { leaderboardRouter } from './routes/leaderboard';
import { logger } from './utils/logger';
import { connectRedis, isRedisConnected } from './config/redis';
import { connectDatabase } from './config/database';
import { bettingRoutes } from './routes/betting';
import { oddsRoutes } from './routes/odds';
import { liquidityRoutes } from './routes/liquidity';
import { oracleRoutes } from './routes/oracle';
import { governanceRoutes } from './routes/governance';
import { authRoutes } from './routes/auth';
import { initializeSocketHandlers } from './services/socketService';
import { responsibleGamblingRoutes } from './routes/responsibleGambling';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Prometheus metrics (issue #17)
const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const betPlacementCounter = new client.Counter({
  name: 'bet_placements_total',
  help: 'Total bet placements',
  registers: [register],
});

export const activeWsConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Active WebSocket connections',
  registers: [register],
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Build CORS allowlist from env (comma-separated) or fall back to dev default
const corsAllowlist: string[] = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3100'];

const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
      },
    },
    // Enable HSTS only in production
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin) return callback(null, true);
      if (corsAllowlist.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Track request metrics (issue #17)
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, route: req.path, status: res.statusCode });
    end();
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected',
      redis: isRedisConnected() ? 'connected' : 'unavailable',
      stellar: 'connected',
      oracle: 'connected',
    },
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Prometheus metrics endpoint (issue #17) - restricted to internal network
app.get('/metrics', async (req, res) => {
  const allowedIPs = (process.env.METRICS_ALLOWED_IPS || '127.0.0.1,::1,::ffff:127.0.0.1').split(',');
  const clientIP = req.ip || '';
  if (process.env.NODE_ENV === 'production' && !allowedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.set('Content-Type', register.contentType);
  return res.end(await register.metrics());
});

// API documentation endpoint
app.get('/api/v1/docs', (req, res) => {
  res.json({
    title: 'SportBetX API Gateway',
    version: '1.0.0',
    description: 'Main API gateway for SportBetX sports betting platform',
    endpoints: {
      betting: '/api/v1/betting',
      odds: '/api/v1/odds',
      liquidity: '/api/v1/liquidity',
      oracle: '/api/v1/oracle',
      governance: '/api/v1/governance',
      responsibleGambling: '/api/v1/responsible-gambling',
      leaderboard: '/api/v1/leaderboard',
    },
    websocket: '/socket.io',
  });
});

// API routes
app.use('/api/v1/betting', bettingRoutes);
app.use('/api/v1/odds', oddsRoutes);
app.use('/api/v1/liquidity', liquidityRoutes);
app.use('/api/v1/oracle', oracleRoutes);
app.use('/api/v1/governance', governanceRoutes);
app.use('/api/v1/responsible-gambling', responsibleGamblingRoutes);
app.use('/api/v1/leaderboard', leaderboardRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(stellarErrorMiddleware);
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Create Socket.IO server
const io = new SocketIOServer(server, {
  cors: {
    origin: corsAllowlist,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Initialize Socket.IO handlers
initializeSocketHandlers(io);

// Track active WebSocket connections (issue #17)
io.on('connection', () => activeWsConnections.inc());
io.on('disconnect', () => activeWsConnections.dec());

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // Start server
    server.listen(PORT, () => {
      logger.info(`🏈 SportBetX API Gateway running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api/v1/docs`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
      logger.info(`🔌 Socket.IO: Real-time betting updates enabled`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  stopSocketServices();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  stopSocketServices();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
startServer();

// Export for testing
export { app, server, io };
