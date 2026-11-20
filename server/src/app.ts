import Anthropic from '@anthropic-ai/sdk';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { type Ai, AiUnavailable } from './claude';
import { EpisodeRequest, FeedbackRequest, ReportRequest, SpeechRequest } from './schemas';
import { type Tts, TtsUnavailable } from './tts';
import { DailyLimiter, type ReportStore } from './store';

export interface Deps {
  ai: Ai;
  reports: ReportStore;
  /** Podcast voices. Without it, the app reads the podcast with the phone's own voices. */
  tts?: Tts;
  limiter?: DailyLimiter;
  adminToken?: string;
  /** Allowed web origins for CORS. Native apps do not send an Origin header. */
  origins?: string[];
}

// Beta limits: 10 lessons a day is about 10 episodes and 100 feedback checks. An episode has about 50 to 70 lines to voice.
export const DEFAULT_LIMITS = { feedback: 150, episode: 12, report: 100, speech: 900 };

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function createApp(deps: Deps) {
  const app = new Hono();
  const limiter = deps.limiter ?? new DailyLimiter(DEFAULT_LIMITS);

  app.use('/v1/*', cors({ origin: deps.origins?.length ? deps.origins : '*', allowHeaders: ['Content-Type', 'X-Install-Id'], allowMethods: ['GET', 'POST'] }));

  const installId = (c: { req: { header: (n: string) => string | undefined } }) => {
    const id = c.req.header('X-Install-Id') ?? '';
    return /^[a-z0-9-]{6,64}$/i.test(id) ? id : null;
  };

  app.get('/health', (c) => c.json({ ok: true }));

  app.post('/v1/feedback', async (c) => {
    const id = installId(c);
    if (!id) return c.json({ error: 'missing install id' }, 400);
    const body = FeedbackRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid request' }, 400);
    if (!limiter.allow(id, 'feedback')) return c.json({ error: 'daily limit reached' }, 429);
    return handleAi(c, () => deps.ai.feedback(body.data));
  });

  app.post('/v1/episode', async (c) => {
    const id = installId(c);
    if (!id) return c.json({ error: 'missing install id' }, 400);
    const body = EpisodeRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid request' }, 400);
    if (!limiter.allow(id, 'episode')) return c.json({ error: 'daily limit reached' }, 429);
    return handleAi(c, async () => {
      const ep = await deps.ai.episode(body.data);
      // Start voicing the episode now, in order, so the audio is ready when the learner presses play.
      if (deps.tts) for (const l of ep.lines) deps.tts.speak(l.text, l.speaker).catch(() => {});
      return ep;
    });
  });

  /** Audio for one podcast line. Returns a URL to the MP3, which is made once and then cached. */
  app.post('/v1/speech', async (c) => {
    const id = installId(c);
    if (!id) return c.json({ error: 'missing install id' }, 400);
    if (!deps.tts) return c.json({ error: 'voices not configured' }, 503);
    const body = SpeechRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid request' }, 400);
    if (!limiter.allow(id, 'speech')) return c.json({ error: 'daily limit reached' }, 429);
    try {
      const clip = await deps.tts.speak(body.data.text, body.data.speaker);
      return c.json({ url: `/v1/audio/${clip}.mp3` });
    } catch (e) {
      console.warn('speech unavailable:', e instanceof TtsUnavailable ? e.message : e);
      return c.json({ error: 'unavailable' }, 503);
    }
  });

  /** The MP3 files. The name is a hash of the line, so it cannot be guessed. */
  app.get('/v1/audio/:file', async (c) => {
    const clip = c.req.param('file').replace(/\.mp3$/, '');
    const mp3 = deps.tts ? await deps.tts.read(clip) : null;
    if (!mp3) return c.json({ error: 'not found' }, 404);
    return c.body(new Uint8Array(mp3), 200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' });
  });

  app.post('/v1/report', async (c) => {
    const id = installId(c);
    if (!id) return c.json({ error: 'missing install id' }, 400);
    const body = ReportRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid request' }, 400);
    if (!limiter.allow(id, 'report')) return c.json({ error: 'daily limit reached' }, 429);
    await deps.reports.add({ ...body.data, installId: id, receivedAt: new Date().toISOString() });
    return c.json({ ok: true });
  });

  /** Triage view for the team: reports grouped by word, as CSV (opens in Excel or Google Sheets). */
  app.get('/admin/reports.csv', async (c) => {
    if (!deps.adminToken || c.req.header('Authorization') !== `Bearer ${deps.adminToken}`) return c.json({ error: 'unauthorized' }, 401);
    const all = await deps.reports.all();
    const byWord = new Map<string, typeof all>();
    for (const r of all) byWord.set(r.wordId, [...(byWord.get(r.wordId) ?? []), r]);
    const rows = [...byWord.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([wordId, rs]) => {
        const reasons = [...new Set(rs.map((r) => r.reason))].join(' ');
        const notes = rs.map((r) => r.note).filter(Boolean).join(' | ');
        const needsReview = rs.length >= 3 || rs.some((r) => r.note.trim());
        return [wordId, rs[0].word, rs.length, reasons, notes, needsReview ? 'yes' : 'no', rs[rs.length - 1].receivedAt].map(csvCell).join(',');
      });
    const csv = ['word_id,word,reports,reasons,notes,needs_review,last_report', ...rows].join('\n');
    return c.body(csv, 200, { 'Content-Type': 'text/csv; charset=utf-8' });
  });

  return app;
}

async function handleAi(c: { json: (o: unknown, s?: 200 | 422 | 429 | 502 | 503) => Response }, fn: () => Promise<unknown>) {
  try {
    return c.json(await fn());
  } catch (e) {
    if (e instanceof AiUnavailable) { console.warn('ai unavailable:', e.message); return c.json({ error: 'unavailable' }, 422); }
    if (e instanceof Anthropic.RateLimitError) { console.warn('rate limited by Claude API'); return c.json({ error: 'busy' }, 503); }
    if (e instanceof Anthropic.APIError) { console.error(`Claude API error ${e.status}:`, e.message); return c.json({ error: 'upstream error' }, 502); }
    console.error('unexpected error:', e);
    return c.json({ error: 'server error' }, 502);
  }
}
