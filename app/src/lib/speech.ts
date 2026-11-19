/**
 * Text-to-speech (expo-speech) and speech recognition (expo-speech-recognition).
 * Speech recognition needs a development build on iOS and Android. In Expo Go
 * the native module is missing, so getRecognizer() returns null and the app
 * falls back to typing.
 */
import { requireOptionalNativeModule } from 'expo';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import type { Host } from './podcast';
import { type HostVoices, pickHostVoices } from './voices';

let voiceMap: HostVoices | null = null;
let listening = false;

/** Chooses the most natural voices on this device for Mia and Leo (see voices.ts). */
export async function loadVoices(): Promise<void> {
  try {
    voiceMap = pickHostVoices(await Speech.getAvailableVoicesAsync());
  } catch {
    voiceMap = { same: true };
  }
  // Browsers can add voices after the first list (Edge adds its "Natural" voices a moment later), so pick again.
  if (Platform.OS === 'web' && !listening && typeof window !== 'undefined' && window.speechSynthesis?.addEventListener) {
    listening = true;
    window.speechSynthesis.addEventListener('voiceschanged', () => { loadVoices(); });
  }
}

let token = 0;

export interface SpeakOptions {
  host?: Host;
  rate?: number;
  /** Runs when the line finishes, but not after stopSpeaking(). */
  onEnd?: () => void;
  /** Runs when speech could not play at all. Without it, onEnd runs instead. */
  onFail?: () => void;
}

/** Speaks text with the host's voice. */
export function speak(text: string, opts: SpeakOptions = {}): void {
  const host = opts.host ?? 'Mia';
  const my = ++token;
  const done = () => { if (my === token) opts.onEnd?.(); };
  const fail = () => { if (my === token) (opts.onFail ?? opts.onEnd)?.(); };
  const pitch = voiceMap?.same ? (host === 'Leo' ? 0.82 : 1.12) : 1;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // Try the chosen voice first, then the browser's default voice if that one does not start.
    const current = () => my === token;
    const voice = voiceMap?.[host];
    const useVoice = voice && !brokenVoices.has(voice) ? voice : undefined;
    webSpeak(text, useVoice, opts.rate ?? 1, pitch, done, () => {
      if (!useVoice) { fail(); return; }
      brokenVoices.add(useVoice);
      if (current()) webSpeak(text, undefined, opts.rate ?? 1, pitch, done, fail, current);
    }, current);
    return;
  }
  try {
    Speech.speak(text, { language: 'en-US', voice: voiceMap?.[host], rate: opts.rate ?? 1, pitch, onDone: done, onError: fail });
  } catch {
    fail();
  }
}

export function stopSpeaking(): void {
  token++;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    lastCancel = Date.now();
    window.speechSynthesis.cancel();
    return;
  }
  Speech.stop().catch(() => {});
}

/* ---------------- Web speech, with fixes for Chrome on Android ---------------- */

/** Chrome can garbage-collect an utterance while it plays, and then never fires its end event. */
const playing = new Set<SpeechSynthesisUtterance>();
/** Voices that failed to start on this device. They are not tried again. */
const brokenVoices = new Set<string>();
let lastCancel = 0;

function webSpeak(text: string, voiceId: string | undefined, rate: number, pitch: number, onDone: () => void, onFail: () => void, current: () => boolean): void {
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  const voice = voiceId ? synth.getVoices().find((v) => v.voiceURI === voiceId) : undefined;
  if (voice) u.voice = voice;
  // Android reports codes like en_US; speech needs the standard form en-US.
  u.lang = (voice?.lang ?? 'en-US').replace('_', '-');
  u.rate = rate;
  u.pitch = pitch;
  let started = false;
  let finished = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const finish = (ok: boolean) => {
    if (finished) return;
    finished = true;
    timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    playing.delete(u);
    (ok ? onDone : onFail)();
  };
  u.onstart = () => { started = true; };
  u.onend = () => finish(true);
  u.onerror = (e) => {
    // A stop or a new line interrupted this one: not a failure, and nothing should run.
    if (e.error === 'interrupted' || e.error === 'canceled') { finished = true; timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); playing.delete(u); return; }
    finish(false);
  };
  const go = () => {
    if (!current()) return; // stopped, or another line started, while waiting
    playing.add(u);
    if (synth.paused) synth.resume();
    synth.speak(u);
    // Nothing started after 4 seconds: this voice does not work here.
    timers.push(setTimeout(() => { if (!started && !synth.speaking && !finished) { lastCancel = Date.now(); synth.cancel(); finish(false); } }, 4000));
    // Some browsers never fire "end": also finish when the browser stops speaking.
    const poll = setInterval(() => { if (finished) clearInterval(poll); else if (started && !synth.speaking && !synth.pending) { clearInterval(poll); finish(true); } }, 500);
    timers.push(poll as unknown as ReturnType<typeof setTimeout>);
    // Last resort: move on after a generous estimate of the line's length.
    const words = text.split(/\s+/).length;
    timers.push(setTimeout(() => finish(true), (words / (110 * rate)) * 60_000 + 5000));
  };
  // Chrome on Android can drop speech that starts right after cancel(), so wait a moment.
  const wait = 300 - (Date.now() - lastCancel);
  if (wait > 0) setTimeout(go, wait); else go();
}

/* ---------------- Sound check (diagnostics for learners and testers) ---------------- */

export interface SpeechInfo {
  supported: boolean;
  /** Inside an app's built-in browser (Android WebView), where speech usually does not work. */
  inAppBrowser: boolean;
  voices: number;
  englishVoices: string[];
  mia?: string;
  leo?: string;
  broken: string[];
  browser: string;
}

export function speechInfo(): SpeechInfo {
  const web = Platform.OS === 'web' && typeof window !== 'undefined';
  const synth = web && 'speechSynthesis' in window ? window.speechSynthesis : null;
  const all = synth ? synth.getVoices() : [];
  const ua = web ? navigator.userAgent : Platform.OS;
  return {
    supported: Platform.OS !== 'web' || !!synth,
    inAppBrowser: web && /; wv\)|FBAN|FBAV|Instagram|Line\//.test(ua),
    voices: all.length,
    englishVoices: all.filter((v) => /^en[-_]/i.test(v.lang)).map((v) => `${v.name} (${v.lang})`),
    mia: voiceMap?.Mia,
    leo: voiceMap?.Leo,
    broken: [...brokenVoices],
    browser: ua,
  };
}

/**
 * Speaks one test sentence and reports every event the browser sends, so a tester can tell us
 * exactly what happens on their phone. `voice` undefined means the browser's default voice.
 */
export function testSpeech(voice: string | undefined, log: (line: string) => void): void {
  const t0 = Date.now();
  const at = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
  if (Platform.OS !== 'web') {
    Speech.speak('This is a sound check.', { language: 'en-US', voice, onStart: () => log(`${at()} started`), onDone: () => log(`${at()} finished`), onError: (e) => log(`${at()} error: ${e.message}`) });
    return;
  }
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  if (!synth) { log('This browser has no speech support.'); return; }
  synth.cancel();
  const u = new SpeechSynthesisUtterance('This is a sound check. Can you hear me?');
  const v = voice ? synth.getVoices().find((x) => x.voiceURI === voice) : undefined;
  if (v) u.voice = v;
  u.lang = (v?.lang ?? 'en-US').replace('_', '-');
  u.onstart = () => log(`${at()} started speaking`);
  u.onend = () => log(`${at()} finished`);
  u.onerror = (e) => log(`${at()} error: ${e.error}`);
  playing.add(u);
  log(`Testing ${v ? v.name : 'default voice'} (${u.lang})`);
  // Speak right away, inside the tap, which Chrome on Android requires.
  synth.speak(u);
  setTimeout(() => log(`${at()} speaking=${synth.speaking} pending=${synth.pending}`), 1500);
  setTimeout(() => { if (synth.speaking || synth.pending) log(`${at()} still going`); playing.delete(u); }, 6000);
}

/** Plays a short beep through Web Audio, to check that the phone's media volume works at all. */
export function testBeep(log: (line: string) => void): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') { log('Beep test is for the web version.'); return; }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) { log('This browser cannot play test sounds.'); return; }
  try {
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    gain.gain.value = 0.2;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    log(`Beep played (audio ${ctx.state}). Did you hear it?`);
  } catch (e) {
    log(`Beep failed: ${(e as Error).message}`);
  }
}

/* ---------------- Speech recognition ---------------- */

type Recognizer = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;
let recognizer: Recognizer | null | undefined;

export function getRecognizer(): Recognizer | null {
  if (recognizer !== undefined) return recognizer;
  try {
    if (Platform.OS !== 'web' && !requireOptionalNativeModule('ExpoSpeechRecognition')) {
      recognizer = null;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('expo-speech-recognition') as typeof import('expo-speech-recognition');
      recognizer = mod.ExpoSpeechRecognitionModule.isRecognitionAvailable() ? mod.ExpoSpeechRecognitionModule : null;
    }
  } catch {
    recognizer = null;
  }
  return recognizer;
}

export interface ListenHandlers {
  onText: (text: string, confidence: number | null, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}

/** Starts listening. Returns a function that stops listening. */
export async function startListening(h: ListenHandlers): Promise<(() => void) | null> {
  const rec = getRecognizer();
  if (!rec) {
    h.onError('Voice input is not available on this device. Type your sentence instead.');
    return null;
  }
  const perm = await rec.requestPermissionsAsync();
  if (!perm.granted) {
    h.onError('Microphone permission is off. Turn it on in Settings, or type your sentence.');
    return null;
  }
  const subs = [
    rec.addListener('result', (e) => {
      const r = e.results[0];
      if (!r) return;
      h.onText(r.transcript.trim(), r.confidence >= 0 && e.isFinal ? r.confidence : null, e.isFinal);
    }),
    rec.addListener('error', (e) => {
      if (e.error === 'no-speech') h.onError("I didn't hear anything. Tap the mic and try again.");
      else if (e.error === 'not-allowed') h.onError('Microphone permission is off. Type your sentence instead.');
      else if (e.error !== 'aborted') h.onError('Voice input stopped. Try again, or type your sentence.');
    }),
    rec.addListener('end', () => {
      subs.forEach((s) => s.remove());
      h.onEnd();
    }),
  ];
  rec.start({ lang: 'en-US', interimResults: true, continuous: false, addsPunctuation: true });
  return () => rec.stop();
}
