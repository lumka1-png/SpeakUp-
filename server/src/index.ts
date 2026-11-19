import { serve } from '@hono/node-server';

import { createApp } from './app';
import { createClaudeAi, MODEL } from './claude';
import { fileReportStore } from './store';

const port = Number(process.env.PORT || 8787);
if (!process.env.ANTHROPIC_API_KEY) console.warn('ANTHROPIC_API_KEY is not set: Claude requests will fail and the app will use offline feedback.');

const app = createApp({
  ai: createClaudeAi(),
  reports: fileReportStore(process.env.REPORTS_FILE || './data/reports.jsonl'),
  adminToken: process.env.ADMIN_TOKEN,
  origins: (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
});

serve({ fetch: app.fetch, port }, () => console.log(`SpeakUp! API on http://localhost:${port} (model: ${MODEL})`));
