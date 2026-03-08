import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { projectsRouter } from './modules/projects/projects.routes';
import { documentsRouter } from './modules/documents/documents.routes';
import { chatRouter } from './modules/chat/chat.routes';

export function createApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    }),
  );

  // Parsing
  app.use(express.json({ limit: '1mb' }));

  // Rate limiting
  app.use(generalLimiter);

  // Logging
  app.use(requestLogger);

  // Health check (no auth)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth (all routes below require authentication)
  app.use(authMiddleware);

  // Routes
  app.use('/api/projects', projectsRouter);
  app.use('/api/projects/:projectId/documents', documentsRouter);
  app.use('/api/projects/:projectId/chat', chatRouter);

  // Error handling
  app.use(errorHandler);

  return app;
}
