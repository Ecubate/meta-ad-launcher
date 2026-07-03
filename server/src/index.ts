import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { api } from './routes/api.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, metaVersion: env.meta.version }));
app.use('/api', api);

app.listen(env.port, () => {
  console.log(`\n  ▶ Meta Ad Launcher API  http://localhost:${env.port}`);
  console.log(`    Meta API ${env.meta.version} · token ${env.meta.systemUserToken ? 'set' : 'MISSING (set META_SYSTEM_USER_TOKEN)'}\n`);
});
