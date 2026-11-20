/**
 * Setup check for the team: are the Claude and OpenAI keys accepted, and can the server save files?
 * Uses free calls only (looking up the model), so it costs nothing to open.
 */
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { apiKey, MODEL } from './claude';
import { maskKey } from './keys';
import { TTS_MODEL, ttsKey } from './tts';

interface Check { ok: boolean; detail: string }

async function checkApi(url: string, headers: Record<string, string>, fetchImpl: typeof fetch): Promise<Check> {
  try {
    const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(15_000) });
    if (res.ok) return { ok: true, detail: 'key accepted, model available' };
    const body = (await res.text()).slice(0, 300);
    // A restricted key (for example audio only) is accepted but may not look up models: that is fine.
    if (res.status === 403 && /missing scopes/i.test(body)) return { ok: true, detail: 'key accepted (restricted key: the model lookup is outside its permissions, which is fine)' };
    const hint = res.status === 401 ? 'the key was rejected: copy it again from the provider and paste it with nothing around it'
      : res.status === 403 ? 'the key has no access to this model or the account needs billing set up'
      : res.status === 404 ? 'the model name was not found'
      : 'see the message';
    return { ok: false, detail: `HTTP ${res.status}: ${hint}. ${body}` };
  } catch (e) {
    return { ok: false, detail: `could not connect: ${(e as Error).message}` };
  }
}

async function checkFolder(file: string | undefined): Promise<Check> {
  if (!file) return { ok: false, detail: 'not set' };
  try {
    await mkdir(file, { recursive: true });
    const probe = join(file, `.write-test-${process.pid}`);
    await writeFile(probe, 'ok');
    await unlink(probe);
    return { ok: true, detail: `${file} is writable` };
  } catch (e) {
    return { ok: false, detail: `${file}: ${(e as Error).message}` };
  }
}

export async function setupStatus(fetchImpl: typeof fetch = fetch) {
  const claudeKey = apiKey();
  const openaiKey = ttsKey();
  const [claude, openai, audio] = await Promise.all([
    claudeKey
      ? checkApi(`https://api.anthropic.com/v1/models/${MODEL}`, { 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01' }, fetchImpl)
      : Promise.resolve({ ok: false, detail: 'SPEAKUP_CLAUDE_KEY is not set' }),
    openaiKey
      ? checkApi(`https://api.openai.com/v1/models/${TTS_MODEL}`, { Authorization: `Bearer ${openaiKey}` }, fetchImpl)
      : Promise.resolve({ ok: false, detail: 'SPEAKUP_OPENAI_KEY is not set (the podcast uses device voices)' }),
    checkFolder(process.env.AUDIO_DIR || './data/audio'),
  ]);
  return {
    ok: claude.ok && openai.ok && audio.ok,
    claude: { ...claude, model: MODEL, key: maskKey(claudeKey) },
    openai: { ...openai, model: TTS_MODEL, key: maskKey(openaiKey) },
    audioFolder: audio,
    reportsFile: process.env.REPORTS_FILE || './data/reports.jsonl',
    allowedOrigins: process.env.ALLOWED_ORIGINS || '(any)',
    node: process.version,
  };
}
