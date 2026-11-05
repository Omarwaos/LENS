import express from 'express';
import cookieParser from 'cookie-parser';
import { randomBytes } from 'node:crypto';
import { publicDir } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { localOnly } from './middlewares/security.js';
import { createApiRouter } from './routes/index.js';

export function createApp(db, service) {
  const app = express();
  app.disable('x-powered-by');
  app.enable('case sensitive routing');
  app.use(localOnly);
  app.use('/api', cookieParser(), createApiRouter(db, service, randomBytes(32)), notFound);
  app.use(express.static(publicDir, { redirect: false, cacheControl: false }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
