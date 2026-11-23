import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApp } from '../src/app';
import { AiUnavailable, cleanEpisode, cleanWord, type Ai } from '../src/claude';
import type { EpisodeOutput } from '../src/schemas';
import { DailyLimiter, memoryReportStore } from '../src/store';
import { createOpenAiTts } from '../src/tts';
import { cleanKey, maskKey } from '../src/keys';
import { setupStatus } from '../src/status';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ID = 'abc123-test';
const fakeFeedback = { usedTargetWord: true, meaningCorrect: true, meaningExplanation: '', meaningExplanationZh: '', grammarScore: 90, issues: [], correctedSentence: 'Hi.', naturalVersion: 'Hi.', suspectedMispronunciations: [], encouragement: 'Nice!' };
const fakeWord = { found: true, reason: '', reasonZh: '', word: 'negotiate', pos: 'v.' as const, zh: '談判；協商', def: 'to talk to reach an agreement', ex: 'We need to negotiate a better price.' };
const fakeAi = (over: Partial<Ai> = {}): Ai => ({ feedback: async () => fakeFeedback, episode: async () => ({ title: 't', lines: [], quiz: [] }), word: async () => fakeWord, ...over });
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

test('speech: makes each clip once, caches it, and serves the MP3', async () => {
  process.env.SPEAKUP_OPENAI_KEY = 'test-key';
  let calls = 0;
  const fakeFetch = (async (_url: string, init: { body: string }) => {
    calls++;
    const body = JSON.parse(init.body);
    assert.equal(body.voice, body.input.startsWith('Leo') ? 'cedar' : 'marin');
    return new Response(new Uint8Array(2000).fill(7), { status: 200 });
  }) as unknown as typeof fetch;
  const tts = createOpenAiTts(await mkdtemp(join(tmpdir(), 'speakup-audio-')), fakeFetch);
  const app = createApp({ ai: fakeAi(), reports: memoryReportStore(), tts });

  assert.equal((await post(app, '/v1/speech', { speaker: 'Mia', text: '' })).status, 400);
  assert.equal((await post(app, '/v1/speech', { speaker: 'Bob', text: 'Hi' })).status, 400);
  const r1 = await (await post(app, '/v1/speech', { speaker: 'Mia', text: 'Mia says hello.' })).json() as { url: string };
  const r2 = await (await post(app, '/v1/speech', { speaker: 'Mia', text: '  Mia says   hello. ' })).json() as { url: string };
  assert.equal(r1.url, r2.url, 'same line gives the same clip');
  assert.equal(calls, 1, 'a cached line is not paid for twice');
  const mp3 = await app.request(r1.url);
  assert.equal(mp3.status, 200);
  assert.equal(mp3.headers.get('Content-Type'), 'audio/mpeg');
  assert.equal((await mp3.arrayBuffer()).byteLength, 2000);
  assert.equal((await app.request('/v1/audio/../../etc/passwd')).status, 404);
  assert.equal((await app.request('/v1/audio/' + 'a'.repeat(64) + '.mp3')).status, 404);

  // A new episode is voiced in the background, in order.
  const lines = [{ speaker: 'Mia', text: 'Mia line one.' }, { speaker: 'Leo', text: 'Leo line two.' }] as const;
  const epApp = createApp({ ai: fakeAi({ episode: async () => ({ title: 't', lines: [...lines], quiz: [] }) }), reports: memoryReportStore(), tts });
  assert.equal((await post(epApp, '/v1/episode', { topic: 'Travel', level: 0, words: ['a', 'b', 'c', 'd'].map((w) => ({ w, pos: 'n.', def: 'x' })) })).status, 200);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(calls, 3);
  delete process.env.SPEAKUP_OPENAI_KEY;
});

test('speech: without voices configured, the app is told to use device voices', async () => {
  const app = createApp({ ai: fakeAi(), reports: memoryReportStore() });
  assert.equal((await post(app, '/v1/speech', { speaker: 'Mia', text: 'Hello.' })).status, 503);
});

test('keys pasted with spaces, line breaks, or quotes are cleaned', () => {
  assert.equal(cleanKey('  sk-ant-abc123\n'), 'sk-ant-abc123');
  assert.equal(cleanKey('"sk-ant-abc123"'), 'sk-ant-abc123');
  assert.equal(cleanKey(" 'sk-abc' "), 'sk-abc');
  assert.equal(cleanKey(undefined), '');
  assert.equal(maskKey('sk-ant-api03-ABCDEFGHIJKLMNOP-wxyz'), 'sk-ant-…wxyz (34 characters)');
  assert.equal(maskKey(''), '(not set)');
});

test('admin status needs the token and explains a rejected key', async () => {
  const app = createApp({ ai: fakeAi(), reports: memoryReportStore(), adminToken: 'secret', status: async () => ({ ok: true }) });
  assert.equal((await app.request('/admin/status')).status, 401);
  assert.equal((await app.request('/admin/status?token=wrong')).status, 401);
  assert.deepEqual(await (await app.request('/admin/status?token=secret')).json(), { ok: true });
  assert.equal((await app.request('/admin/reports.csv?token=secret')).status, 200);

  process.env.SPEAKUP_CLAUDE_KEY = '  "sk-ant-test-key-1234"  ';
  process.env.SPEAKUP_OPENAI_KEY = 'sk-openai-test-5678';
  process.env.AUDIO_DIR = await mkdtemp(join(tmpdir(), 'speakup-status-'));
  const seen: Record<string, string> = {};
  const fakeFetch = (async (url: string, init: { headers: Record<string, string> }) => {
    if (url.includes('anthropic')) { seen.claude = init.headers['x-api-key']; return new Response('{"type":"error"}', { status: 401 }); }
    seen.openai = init.headers.Authorization;
    // A restricted OpenAI key: allowed to make audio, but not to look up models.
    return new Response('{"error":"Missing scopes: api.model.read"}', { status: 403 });
  }) as unknown as typeof fetch;
  const st = await setupStatus(fakeFetch);
  assert.equal(seen.claude, 'sk-ant-test-key-1234', 'the cleaned key is sent');
  assert.equal(st.claude.ok, false);
  assert.match(st.claude.detail, /401: the key was rejected/);
  assert.equal(st.openai.ok, true);
  assert.equal(st.audioFolder.ok, true);
  assert.equal(st.ok, false);
  assert.ok(!JSON.stringify(st).includes('test-key-1234'), 'keys are never shown in full');
  delete process.env.SPEAKUP_CLAUDE_KEY; delete process.env.SPEAKUP_OPENAI_KEY; delete process.env.AUDIO_DIR;
});

test('word lookup validates input and returns the entry', async () => {
  const app = createApp({ ai: fakeAi(), reports: memoryReportStore() });
  assert.equal((await post(app, '/v1/word', { text: 'negotiate', level: 1 }, null)).status, 400);
  assert.equal((await post(app, '/v1/word', { text: '   ', level: 1 })).status, 400);
  assert.equal((await post(app, '/v1/word', { text: 'x'.repeat(41), level: 1 })).status, 400);
  const ok = await post(app, '/v1/word', { text: 'negociate', level: 1 });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), fakeWord);
});

test('word lookup has its own daily limit', async () => {
  const app = createApp({ ai: fakeAi(), reports: memoryReportStore(), limiter: new DailyLimiter({ word: 1 }) });
  assert.equal((await post(app, '/v1/word', { text: 'hello', level: 0 })).status, 200);
  assert.equal((await post(app, '/v1/word', { text: 'hello', level: 0 })).status, 429);
});

test('word cleanup trims fields and rejects incomplete entries', () => {
  assert.equal(cleanWord({ ...fakeWord, word: '  negotiate ' }).word, 'negotiate');
  assert.equal(cleanWord({ ...fakeWord, def: 'To talk to reach an agreement.' }).def, 'to talk to reach an agreement');
  assert.equal(cleanWord({ ...fakeWord, def: 'TV news' }).def, 'TV news');
  assert.throws(() => cleanWord({ ...fakeWord, zh: '' }), AiUnavailable);
  const notFound = { ...fakeWord, found: false, reason: ' Not a word. ', word: '', zh: '', def: '', ex: '' };
  assert.equal(cleanWord(notFound).reason, 'Not a word.');
});
