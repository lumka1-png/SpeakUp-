import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApp } from '../src/app';
import { AiUnavailable, cleanEpisode, createClaudeAi, type Ai } from '../src/claude';
import type { EpisodeOutput } from '../src/schemas';
import { DailyLimiter, memoryReportStore } from '../src/store';

const ID = 'abc123-test';
const fakeFeedback = { usedTargetWordCorrectly: true, grammarScore: 90, issues: [], correctedSentence: 'Hi.', naturalVersion: 'Hi.', suspectedMispronunciations: [], encouragement: 'Nice!' };
const fakeAi = (over: Partial<Ai> = {}): Ai => ({ feedback: async () => fakeFeedback, episode: async () => ({ title: 't', lines: [], quiz: [] }), ...over });
const post = (app: ReturnType<typeof createApp>, path: string, body: unknown, id: string | null = ID) =>
  app.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(id ? { 'X-Install-Id': id } : {}) }, body: JSON.stringify(body) });
const fb = { word: { w: 'refund', pos: 'n.', def: 'money given back' }, transcript: 'I want a refund.', confidence: 0.9, viaMic: true, level: 1 };

test('feedback validates input and returns Claude output', async () => {
  const app = createApp({ ai: fakeAi(), reports: memoryReportStore() });
  assert.equal((await post(app, '/v1/feedback', fb, null)).status, 400);
  assert.equal((await post(app, '/v1/feedback', { ...fb, transcript: '' })).status, 400);
  assert.equal((await post(app, '/v1/feedback', { ...fb, level: 9 })).status, 400);
  const ok = await post(app, '/v1/feedback', fb);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), fakeFeedback);
});

test('daily limits return 429', async () => {
  const app = createApp({ ai: fakeAi(), reports: memoryReportStore(), limiter: new DailyLimiter({ feedback: 2 }) });
  assert.equal((await post(app, '/v1/feedback', fb)).status, 200);
  assert.equal((await post(app, '/v1/feedback', fb)).status, 200);
  assert.equal((await post(app, '/v1/feedback', fb)).status, 429);
  assert.equal((await post(app, '/v1/feedback', fb, 'other-install')).status, 200);
});

test('AI problems become 422 so the app falls back to offline mode', async () => {
  const app = createApp({ ai: fakeAi({ feedback: async () => { throw new AiUnavailable('refused'); } }), reports: memoryReportStore() });
  assert.equal((await post(app, '/v1/feedback', fb)).status, 422);
});

test('a missing API key becomes 422, not a server error', async () => {
  const saved = { key: process.env.ANTHROPIC_API_KEY, token: process.env.ANTHROPIC_AUTH_TOKEN };
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_AUTH_TOKEN;
  try {
    const app = createApp({ ai: createClaudeAi(), reports: memoryReportStore() });
    const res = await post(app, '/v1/feedback', fb);
    assert.equal(res.status, 422);
    assert.deepEqual(await res.json(), { error: 'unavailable' });
  } finally {
    if (saved.key !== undefined) process.env.ANTHROPIC_API_KEY = saved.key;
    if (saved.token !== undefined) process.env.ANTHROPIC_AUTH_TOKEN = saved.token;
  }
});

test('reports are stored and exported as CSV for triage', async () => {
  const reports = memoryReportStore();
  const app = createApp({ ai: fakeAi(), reports, adminToken: 'secret' });
  for (let i = 0; i < 3; i++) assert.equal((await post(app, '/v1/report', { wordId: 'invoice', word: 'invoice', reason: 'zh', note: i ? '' : 'should be 請款單' }, `install-${i}xx`)).status, 200);
  assert.equal((await post(app, '/v1/report', { wordId: 'map', word: 'map', reason: 'nope' })).status, 400);
  assert.equal((await app.request('/admin/reports.csv')).status, 401);
  const csv = await (await app.request('/admin/reports.csv', { headers: { Authorization: 'Bearer secret' } })).text();
  const [header, row] = csv.split('\n');
  assert.ok(header.startsWith('word_id,word,reports'));
  assert.ok(row.startsWith('"invoice","invoice","3","zh","should be 請款單","yes"'));
});

test('episode cleanup rejects broken quizzes and missing words', () => {
  const req = { topic: 'Travel', level: 1, words: ['passport', 'luggage', 'ticket', 'map'].map((w) => ({ w, pos: 'n.', def: 'x' })) };
  const lines = Array.from({ length: 12 }, (_, i) => ({ speaker: (i % 2 ? 'Leo' : 'Mia') as 'Mia' | 'Leo', text: `Line ${i} about passport luggage ticket map.` }));
  const q = (answer: string) => ({ question: 'Q?', quote: '', options: ['passport', 'luggage', 'ticket', 'map'], answer });
  const good: EpisodeOutput = { title: 'Trip', lines, quiz: [q('map'), q('ticket'), q('nope'), q('luggage'), q('passport')] };
  assert.equal(cleanEpisode(good, req).quiz.length, 4);
  assert.throws(() => cleanEpisode({ ...good, lines: lines.map((l) => ({ ...l, text: 'Hello there.' })) }, req), AiUnavailable);
  assert.throws(() => cleanEpisode({ ...good, quiz: [q('x'), q('y'), q('map')] }, req), AiUnavailable);
});
