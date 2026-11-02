import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFound } from './lib/http.js';
import { flush } from './store/index.js';
import authRoutes from './routes/auth.js';
import peopleRoutes from './routes/people.js';
import academicRoutes from './routes/academics.js';
import campusRoutes from './routes/campus.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
  app.use(express.json({ limit: '1mb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true, storage: 'memory+json-file', database: null }));
  app.use('/api/auth', authRoutes);
  app.use('/api', authenticate, peopleRoutes, academicRoutes, campusRoutes);
  app.use('/api', (_req, _res, next) => next(notFound('Route API introuvable.')));

  // Serve the built front-end in production (npm run build && npm start).
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = Number(process.env.PORT) || 4000;
  createApp().listen(PORT, () => {
    console.log(`CampusFlow API → http://localhost:${PORT}/api (stockage : mémoire + fichier JSON, sans base de données)`);
  });
  const stop = () => { flush(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
