import { serve } from '@hono/node-server';

import { createApp } from './app';
import { apiKey, createClaudeAi, MODEL } from './claude';
import { fileReportStore } from './store';
import { createOpenAiTts, ttsKey } from './tts';

const port = Number(process.env.PORT || 8787);
if (!apiKey()) console.warn('SPEAKUP_CLAUDE_KEY is not set: Claude requests will fail and the app will use offline feedback.');

if (!ttsKey()) console.warn('SPEAKUP_OPENAI_KEY is not set: the podcast will use the phone\'s own voices.');

const app = createApp({
  ai: createClaudeAi(),
  reports: fileReportStore(process.env.REPORTS_FILE || './data/reports.jsonl'),
  tts: ttsKey() ? createOpenAiTts(process.env.AUDIO_DIR || './data/audio') : undefined,
  adminToken: process.env.ADMIN_TOKEN,
  origins: (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
});

serve({ fetch: app.fetch, port }, () => console.log(`SpeakUp! API on http://localhost:${port} (model: ${MODEL})`));
