/**
 * Natural podcast voices: plays each line as an MP3 that the server makes with OpenAI voices.
 * When the server has no voices (or is unreachable), `cloudVoices()` turns false and the podcast
 * falls back to the phone's own text-to-speech (speech.ts).
 */
import { type AudioPlayer, type AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

import { API_URL } from '../config';
import type { Host } from './podcast';

let disabled = false;
let player: AudioPlayer | null = null;
let statusSub: { remove: () => void } | null = null;
let token = 0;
let modeSet = false;
const urls = new Map<string, Promise<string | null>>();

/** True while server voices are available. */
export const cloudVoices = () => API_URL.length > 0 && !disabled;

/** URL of the MP3 for one line, or null when voices are not available. Cached per line. */
export function lineUrl(text: string, host: Host, installId: string): Promise<string | null> {
  const key = `${host}|${text}`;
  let p = urls.get(key);
  if (!p) {
    p = (async () => {
      if (!cloudVoices()) return null;
      try {
        const res = await fetch(`${API_URL}/v1/speech`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Install-Id': installId },
          body: JSON.stringify({ speaker: host, text }),
        });
        // 503: the server has no voices configured or OpenAI is down. Stop asking for this session.
        if (res.status === 503) { disabled = true; return null; }
        if (!res.ok) return null;
        const { url } = (await res.json()) as { url: string };
        return `${API_URL}${url}`;
      } catch {
        return null;
      }
    })();
    urls.set(key, p);
    p.then((u) => { if (!u) urls.delete(key); });
  }
  return p;
}

/** Starts making the next few lines so playback does not wait between lines. */
export function prefetchLines(lines: { sp: Host; t: string }[], from: number, installId: string, count = 3): void {
  if (!cloudVoices()) return;
  lines.slice(from, from + count).forEach((l) => { lineUrl(l.t, l.sp, installId); });
}

/** Plays one line. onEnd runs when it finishes; onFail when it cannot play (the caller then uses device voices). */
export async function playLine(text: string, host: Host, rate: number, installId: string, cb: { onEnd: () => void; onFail: () => void }): Promise<void> {
  const my = ++token;
  if (!modeSet && Platform.OS !== 'web') {
    modeSet = true;
    // Play even when an iPhone's silent switch is on, like other podcast apps.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }
  // Create the player inside the tap that starts the podcast, so browsers allow it to play.
  player ??= createAudioPlayer(null, { updateInterval: 250 });
  const url = await lineUrl(text, host, installId);
  if (my !== token) return;
  if (!url) { cb.onFail(); return; }
  const p = player;
  statusSub?.remove();
  let started = false;
  let done = false;
  const finish = (ok: boolean) => {
    if (done || my !== token) return;
    done = true;
    statusSub?.remove();
    statusSub = null;
    clearTimeout(watchdog);
    if (ok) cb.onEnd(); else cb.onFail();
  };
  statusSub = p.addListener('playbackStatusUpdate', (s: AudioStatus) => {
    if (s.playing) started = true;
    if (s.didJustFinish) finish(true);
  });
  // If the clip never starts (blocked or broken), let the caller fall back.
  const watchdog = setTimeout(() => { if (!started) finish(false); }, 8000);
  p.replace({ uri: url });
  p.setPlaybackRate(rate);
  p.play();
}

/** Stops the current line. */
export function stopLine(): void {
  token++;
  statusSub?.remove();
  statusSub = null;
  try { player?.pause(); } catch { /* not started yet */ }
}
