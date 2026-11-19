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

type VoiceMap = { Mia?: string; Leo?: string; same: boolean };
let voiceMap: VoiceMap | null = null;

export async function loadVoices(): Promise<void> {
  try {
    const all = await Speech.getAvailableVoicesAsync();
    const en = all.filter((v) => /^en[-_]/i.test(v.language));
    const us = en.filter((v) => /en[-_]US/i.test(v.language));
    const pool = us.length ? us : en;
    const enhanced = (v: Speech.Voice) => (v.quality === Speech.VoiceQuality.Enhanced ? 0 : 1);
    const female = [...pool].sort((a, b) => enhanced(a) - enhanced(b)).find((v) => /samantha|ava|allison|aria|jenny|zira|female|karen|moira|google us english/i.test(v.name)) ?? pool[0];
    const male = en.find((v) => v !== female && /daniel|alex|guy|david|fred|\bmale|arthur|aaron|tom|rishi/i.test(v.name)) ?? en.find((v) => v !== female) ?? female;
    voiceMap = { Mia: female?.identifier, Leo: male?.identifier, same: !female || female === male };
  } catch {
    voiceMap = { same: true };
  }
}

let token = 0;

/** Speaks text. onEnd runs when speech finishes or fails, but not after stopSpeaking(). */
export function speak(text: string, opts: { host?: Host; rate?: number; onEnd?: () => void } = {}): void {
  const host = opts.host ?? 'Mia';
  const my = ++token;
  const done = () => { if (my === token) opts.onEnd?.(); };
  try {
    Speech.speak(text, {
      language: 'en-US',
      voice: voiceMap?.[host],
      rate: opts.rate ?? 1,
      pitch: voiceMap?.same ? (host === 'Leo' ? 0.82 : 1.12) : 1,
      onDone: done,
      onError: done,
    });
  } catch {
    done();
  }
}

export function stopSpeaking(): void {
  token++;
  Speech.stop().catch(() => {});
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
