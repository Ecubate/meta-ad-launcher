import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import { api } from './routes/api.js';
import { setupAuth, authRouter, requireAuth } from './auth.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

setupAuth(app);

app.get('/api/health', (_req, res) => res.json({ ok: true, metaVersion: env.meta.version }));
app.use('/api/auth', authRouter);
// Everything else requires a session.
app.use('/api', requireAuth, api);

// In production, serve the built SPA from the same origin (single pm2 app behind nginx).
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

app.listen(env.port, () => {
  console.log(`\n  ▶ Meta Ad Launcher API  http://localhost:${env.port}`);
  console.log(`    Meta API ${env.meta.version} · token ${env.meta.systemUserToken ? 'set' : 'MISSING (dry-run mode)'}`);
  console.log(`    Auth: Google ${env.google.clientId ? 'configured' : 'not configured'} · dev-login ${env.devLogin ? 'on' : 'off'}\n`);
});
