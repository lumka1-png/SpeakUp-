/**
 * Podcast voices: turns one line of the podcast into an MP3 with OpenAI text-to-speech.
 * Each clip is saved on disk under a hash of (model, voice, instructions, text), so a line
 * is only paid for once, and the app downloads it from GET /v1/audio/<hash>.mp3.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type Host = 'Mia' | 'Leo';

export const TTS_MODEL = process.env.SPEAKUP_TTS_MODEL || 'gpt-4o-mini-tts';
/** Marin and Cedar are OpenAI's most natural voices. Change them here or with SPEAKUP_VOICE_MIA / SPEAKUP_VOICE_LEO. */
export const VOICES: Record<Host, string> = {
  Mia: process.env.SPEAKUP_VOICE_MIA || 'marin',
  Leo: process.env.SPEAKUP_VOICE_LEO || 'cedar',
};
const INSTRUCTIONS: Record<Host, string> = {
  Mia: 'You are Mia, a warm, upbeat podcast host chatting with your friend Leo. Sound natural and relaxed, like a real conversation, with clear pronunciation and a calm, unhurried pace.',
  Leo: 'You are Leo, a friendly, easygoing podcast host chatting with your friend Mia. Sound natural and relaxed, like a real conversation, with clear pronunciation and a calm, unhurried pace.',
};

export const ttsKey = () => process.env.SPEAKUP_OPENAI_KEY || process.env.OPENAI_API_KEY || '';

/** Thrown when audio cannot be made. The app then uses the phone's own voices. */
export class TtsUnavailable extends Error {}

export interface Tts {
  /** Returns the clip id (hash). Makes the clip only if it is not saved yet. */
  speak(text: string, host: Host): Promise<string>;
  /** The MP3 for a clip id, or null if there is none. */
  read(id: string): Promise<Buffer | null>;
}

export const CLIP_ID = /^[a-f0-9]{64}$/;

/** At most `n` jobs at a time, so one episode does not flood the API. */
function limit(n: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async <T>(job: () => Promise<T>): Promise<T> => {
    if (active >= n) await new Promise<void>((r) => queue.push(r));
    active++;
    try { return await job(); } finally { active--; queue.shift()?.(); }
  };
}

export function createOpenAiTts(dir: string, fetchImpl: typeof fetch = fetch): Tts {
  const run = limit(4);
  const inFlight = new Map<string, Promise<string>>();
  const path = (id: string) => join(dir, `${id}.mp3`);

  async function make(id: string, text: string, host: Host): Promise<string> {
    try { await stat(path(id)); return id; } catch { /* not saved yet */ }
    const key = ttsKey();
    if (!key) throw new TtsUnavailable('no OpenAI key (set SPEAKUP_OPENAI_KEY)');
    const res = await run(() => fetchImpl('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: TTS_MODEL, voice: VOICES[host], input: text, instructions: INSTRUCTIONS[host], response_format: 'mp3' }),
      signal: AbortSignal.timeout(30_000),
    }));
    if (!res.ok) throw new TtsUnavailable(`OpenAI speech error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const mp3 = Buffer.from(await res.arrayBuffer());
    if (mp3.length < 500) throw new TtsUnavailable('OpenAI returned an empty clip');
    await mkdir(dir, { recursive: true });
    const tmp = `${path(id)}.${process.pid}.tmp`;
    await writeFile(tmp, mp3);
    await rename(tmp, path(id));
    return id;
  }

  return {
    speak(text, host) {
      const clean = text.trim().replace(/\s+/g, ' ');
      const id = createHash('sha256').update(JSON.stringify([TTS_MODEL, VOICES[host], INSTRUCTIONS[host], clean])).digest('hex');
      const pending = inFlight.get(id);
      if (pending) return pending;
      const p = make(id, clean, host).finally(() => inFlight.delete(id));
      inFlight.set(id, p);
      return p;
    },
    async read(id) {
      if (!CLIP_ID.test(id)) return null;
      try { return await readFile(path(id)); } catch { return null; }
    },
  };
}
