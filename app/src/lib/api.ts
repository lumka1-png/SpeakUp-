import { API_URL } from '../config';
import type { Word } from '../data/words';
import { type Feedback, estimatePronunciation, localFeedback, soundTips } from './analyze';
import { type Episode, type Host, type PodLine, type QuizQ, templateEpisode } from './podcast';
import { shuffle } from './util';

async function post<T>(path: string, body: unknown, installId: string, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Install-Id': installId },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const hasServer = () => API_URL.length > 0;

/* ---------------- Speaking feedback ---------------- */

interface RemoteFeedback {
  usedTargetWordCorrectly: boolean;
  grammarScore: number;
  issues: { explanation: string; explanationZh: string }[];
  correctedSentence: string;
  naturalVersion: string;
  suspectedMispronunciations: { heard: string; intended: string; tip: string; tipZh: string }[];
  encouragement: string;
}

export async function getFeedback(p: {
  word: Word; text: string; confidence: number | null; viaMic: boolean; level: number; installId: string;
}): Promise<Feedback | null> {
  const local = localFeedback(p.text, p.word.w, p.confidence, p.viaMic);
  if (!local || !hasServer()) return local;
  try {
    const r = await post<RemoteFeedback>('/v1/feedback', {
      word: { w: p.word.w, pos: p.word.pos, def: p.word.def },
      transcript: p.text.trim(),
      confidence: p.confidence,
      viaMic: p.viaMic,
      level: p.level,
    }, p.installId, 25_000);
    const misp = (r.suspectedMispronunciations ?? []).slice(0, 3);
    let pron: number | null = null;
    if (p.viaMic) pron = Math.max(40, estimatePronunciation(p.confidence, r.usedTargetWordCorrectly) - misp.length * 8);
    return {
      source: 'claude',
      original: local.original,
      corrected: r.correctedSentence || local.corrected,
      natural: r.naturalVersion && r.naturalVersion !== r.correctedSentence ? r.naturalVersion : undefined,
      issues: (r.issues ?? []).map((i) => ({ msg: i.explanation, zh: i.explanationZh })),
      usedWord: r.usedTargetWordCorrectly,
      grammarScore: Math.max(0, Math.min(100, Math.round(r.grammarScore))),
      pronScore: pron,
      mispronunciations: misp,
      soundTips: soundTips(p.word.w),
      encouragement: r.encouragement,
    };
  } catch {
    return local;
  }
}

/* ---------------- Podcast episode ---------------- */

interface RemoteEpisode {
  title: string;
  lines: { speaker: string; text: string }[];
  quiz: { question: string; quote?: string; options: string[]; answer: string }[];
}

export async function getEpisode(words: Word[], topic: string, topicLabel: string, level: number, installId: string): Promise<Episode> {
  const fallback = templateEpisode(words, topic);
  if (!hasServer()) return fallback;
  try {
    const r = await post<RemoteEpisode>('/v1/episode', {
      words: words.map((w) => ({ w: w.w, pos: w.pos, def: w.def })),
      topic: topicLabel,
      level,
    }, installId, 90_000);
    const lines: PodLine[] = (r.lines ?? [])
      .filter((l) => l.text?.trim())
      .map((l) => ({ sp: (/leo/i.test(l.speaker) ? 'Leo' : 'Mia') as Host, t: l.text.trim() }));
    const quiz: QuizQ[] = (r.quiz ?? [])
      .filter((q) => q.options?.includes(q.answer))
      .map((q) => ({ prompt: q.question, quote: q.quote || undefined, answer: q.answer, options: shuffle(q.options) }));
    if (lines.length < 10 || quiz.length < 3) return fallback;
    return { title: r.title || fallback.title, lines, quiz: quiz.slice(0, 5), source: 'claude' };
  } catch {
    return fallback;
  }
}

/* ---------------- Word reports ---------------- */

export interface WordReport {
  key: string;
  wordId: string;
  word: string;
  reason: 'zh' | 'def' | 'ex' | 'audio' | 'other';
  note: string;
  where: string;
  at: string;
  sent: boolean;
}

/** Sends unsent reports. Returns the keys that the server accepted. */
export async function sendReports(reports: WordReport[], installId: string, appVersion: string): Promise<string[]> {
  if (!hasServer()) return [];
  const sent: string[] = [];
  for (const r of reports.filter((x) => !x.sent)) {
    try {
      await post('/v1/report', { wordId: r.wordId, word: r.word, reason: r.reason, note: r.note, where: r.where, at: r.at, appVersion }, installId, 10_000);
      sent.push(r.key);
    } catch {
      break;
    }
  }
  return sent;
}
