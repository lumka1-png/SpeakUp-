import { API_URL } from '../config';
import { customWord, type Word } from '../data/words';
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
  usedTargetWord?: boolean;
  meaningCorrect?: boolean;
  meaningExplanation?: string;
  meaningExplanationZh?: string;
  /** Older servers return one combined flag instead of the three above. */
  usedTargetWordCorrectly?: boolean;
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
    const usedWord = r.usedTargetWord ?? r.usedTargetWordCorrectly ?? local.usedWord;
    const meaningOk = r.meaningCorrect ?? r.usedTargetWordCorrectly;
    let pron: number | null = null;
    if (p.viaMic) pron = Math.max(40, estimatePronunciation(p.confidence, usedWord) - misp.length * 8);
    return {
      source: 'claude',
      original: local.original,
      corrected: r.correctedSentence || local.corrected,
      natural: r.naturalVersion && r.naturalVersion !== r.correctedSentence ? r.naturalVersion : undefined,
      issues: (r.issues ?? []).map((i) => ({ msg: i.explanation, zh: i.explanationZh })),
      usedWord,
      meaningOk,
      meaningNote: meaningOk === false && r.meaningExplanation ? { msg: r.meaningExplanation, zh: r.meaningExplanationZh ?? '' } : undefined,
      grammarScore: Math.max(0, Math.min(100, Math.round(r.grammarScore))),
      pronScore: pron,
      mispronunciations: misp,
      soundTips: soundTips(p.word.w),
      encouragement: r.encouragement,
    };
  } catch {
    return { ...local, serverFailed: true };
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

/* ---------------- Learner's own words ---------------- */

export type LookupResult = { ok: true; word: Word } | { ok: false; msg: string; zh?: string };

interface RemoteWord { found: boolean; reason: string; reasonZh: string; word: string; pos: string; zh: string; def: string; ex: string }

/** Asks the server to write a dictionary entry for a word the learner typed (English, or Chinese to translate). */
export async function lookupWord(text: string, level: number, installId: string): Promise<LookupResult> {
  const offline = { ok: false as const, msg: "Couldn't look up this word right now. Check your internet connection and try again.", zh: '目前無法查詢這個單字，請確認網路連線後再試一次。' };
  if (!hasServer()) return offline;
  try {
    const r = await post<RemoteWord>('/v1/word', { text: text.trim(), level }, installId, 25_000);
    if (!r.found) return { ok: false, msg: r.reason || "We couldn't find that word. Check the spelling and try again.", zh: r.reasonZh || undefined };
    if (!r.word || !r.zh || !r.def || !r.ex) return offline;
    return { ok: true, word: customWord(r, level) };
  } catch (e) {
    if (/HTTP 429/.test(String(e))) return { ok: false, msg: "You've added a lot of words today. Please try again tomorrow.", zh: '你今天已新增很多單字，請明天再試。' };
    return offline;
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
