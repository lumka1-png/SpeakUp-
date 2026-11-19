/**
 * The lesson in progress. Not persisted: leaving the app mid-lesson starts over
 * (chosen words stay in My Words).
 */
import { create } from 'zustand';

import { getPool, LEVELS, topicName, TOPIC_IDS, type Word } from '../data/words';
import type { Feedback } from '../lib/analyze';
import { getEpisode } from '../lib/api';
import { type Episode, templateEpisode } from '../lib/podcast';
import { affirmation, lessonScore, matchScore, quickScore, scoreLabel, speakItemScore, starsFor, vocabScore, xpFor, type Scores, type WordPerf } from '../lib/scoring';
import { pick } from '../lib/util';
import { useProgress } from './progress';

export type Step = 'pick' | 'g1' | 'g2' | 'g3' | 'inter' | 'speak' | 'listen' | 'quiz' | 'done';
export interface Interlude { title: string; sub: string; score: number; progress: number; next: Step; button: string; tip?: string }
export interface Result { overall: number; vocab: number; stars: number; xp: number; affirmation: [string, string] }
export interface SpokenItem { wordId: string; feedback: Feedback | null; score: number }

interface LessonState {
  active: boolean;
  topic: string;
  random: boolean;
  practice: boolean;
  step: Step;
  pool: Word[];
  selected: string[];
  words: Word[];
  scores: Partial<Scores>;
  perf: Record<string, WordPerf>;
  inter: Interlude | null;
  spoken: SpokenItem[];
  episode: Episode | null;
  episodeLoading: boolean;
  result: Result | null;
  start: (practiceWords?: Word[]) => void;
  toggle: (id: string) => void;
  autoPick: () => void;
  confirmPick: () => void;
  finishG1: (correctIds: string[]) => void;
  finishG2: (mistakes: number, missesById: Record<string, number>) => void;
  finishG3: (correct: number, attempts: number, bestCombo: number) => void;
  addSpoken: (item: SpokenItem) => void;
  finishSpeak: () => void;
  finishQuiz: (correct: number, total: number) => void;
  next: () => void;
  quit: () => void;
}

export const neededCount = (poolSize: number) => Math.min(10, poolSize);

export const useLesson = create<LessonState>()((set, get) => ({
  active: false, topic: 'toeic', random: false, practice: false, step: 'pick', pool: [], selected: [], words: [],
  scores: {}, perf: {}, inter: null, spoken: [], episode: null, episodeLoading: false, result: null,

  start: (practiceWords) => {
    const p = useProgress.getState();
    const random = !practiceWords && p.topic === 'random';
    const topic = practiceWords ? 'mywords' : random ? pick(TOPIC_IDS, 1)[0] : p.topic;
    const base = { active: true, topic, random, practice: !!practiceWords, selected: [], scores: {}, inter: null, spoken: [], episode: null, episodeLoading: false, result: null };
    if (practiceWords) {
      set({ ...base, pool: [], words: practiceWords, step: 'g1', perf: initPerf(practiceWords) });
    } else {
      set({ ...base, pool: getPool(p.level, topic, p.myWords), words: [], step: 'pick', perf: {} });
    }
  },
  toggle: (id) => set((s) => {
    const need = neededCount(s.pool.length);
    if (s.selected.includes(id)) return { selected: s.selected.filter((x) => x !== id) };
    if (s.selected.length >= need) return {};
    return { selected: [...s.selected, id] };
  }),
  autoPick: () => set((s) => {
    const need = neededCount(s.pool.length);
    const rest = s.pool.slice(0, Math.max(need, 20)).filter((w) => !s.selected.includes(w.id));
    return { selected: [...s.selected, ...pick(rest, need - s.selected.length).map((w) => w.id)] };
  }),
  confirmPick: () => {
    const s = get();
    const words = s.selected.map((id) => s.pool.find((w) => w.id === id)).filter((w): w is Word => !!w);
    useProgress.getState().saveWords(words);
    set({ words, perf: initPerf(words), step: 'g1' });
  },
  finishG1: (correctIds) => {
    const s = get();
    const perf = { ...s.perf };
    correctIds.forEach((id) => { if (perf[id]) perf[id] = { ...perf[id], g1: true }; });
    const g1 = Math.round((correctIds.length / s.words.length) * 100);
    set({ perf, scores: { ...s.scores, g1 }, step: 'inter', inter: {
      title: `${scoreLabel(g1)} Game 1 complete.`, sub: `You matched ${correctIds.length} of ${s.words.length} words to their Traditional Chinese meaning.`,
      score: g1, progress: 0.15, next: 'g2', button: 'Next: Match the meaning' } });
  },
  finishG2: (mistakes, missesById) => {
    const s = get();
    const perf = { ...s.perf };
    Object.entries(missesById).forEach(([id, n]) => { if (perf[id]) perf[id] = { ...perf[id], g2Misses: n }; });
    const g2 = matchScore(mistakes);
    set({ perf, scores: { ...s.scores, g2 }, step: 'inter', inter: {
      title: `${scoreLabel(g2)} Game 2 complete.`, sub: mistakes ? `You made ${mistakes} wrong match${mistakes > 1 ? 'es' : ''}. Practice makes perfect!` : 'A perfect round with no wrong matches!',
      score: g2, progress: 0.27, next: 'g3', button: 'Next: Quick Think' } });
  },
  finishG3: (correct, attempts, best) => {
    const s = get();
    const g3 = quickScore(correct, attempts);
    const scores = { ...s.scores, g3 };
    const v = vocabScore({ g1: scores.g1 ?? 0, g2: scores.g2 ?? 0, g3 });
    set({ scores, step: 'inter', inter: {
      title: 'Vocabulary complete!', sub: `Quick Think: ${correct} correct out of ${attempts}, with a best combo of ${best}. Your vocabulary score for this lesson is ${v}%.`,
      score: g3, progress: 0.4, next: 'speak', button: 'Next: Speaking', tip: 'Now say each word out loud in your own sentence. Short and simple is perfect.' } });
  },
  addSpoken: (item) => set((s) => {
    const perf = { ...s.perf };
    const fb = item.feedback;
    if (fb && fb.usedWord && fb.grammarScore >= 70 && perf[item.wordId]) perf[item.wordId] = { ...perf[item.wordId], spoke: true };
    return { spoken: [...s.spoken.filter((x) => x.wordId !== item.wordId), item], perf };
  }),
  finishSpeak: () => {
    const s = get();
    const speak = Math.round(s.words.reduce((a, w) => a + (s.spoken.find((x) => x.wordId === w.id)?.score ?? 0), 0) / s.words.length);
    const done = s.spoken.filter((x) => x.feedback).length;
    set({ scores: { ...s.scores, speak }, step: 'inter', inter: {
      title: `${scoreLabel(speak)} Speaking complete.`, sub: `You spoke ${done} of ${s.words.length} sentences. Next, listen to a short podcast that uses all of your words.`,
      score: speak, progress: 0.7, next: 'listen', button: 'Next: Listening', tip: 'Tip: listen once without the transcript. Then turn it on if you need help.' } });
  },
  finishQuiz: (correct, total) => {
    const s = get();
    const listen = Math.round((correct / Math.max(1, total)) * 100);
    const scores = { ...s.scores, listen } as Scores;
    const overall = lessonScore(scores);
    const xp = xpFor(overall, s.words.length);
    useProgress.getState().recordLesson({ topic: topicName(s.topic), score: overall, xp, perf: s.perf });
    set({ scores, step: 'done', result: { overall, vocab: vocabScore(scores), stars: starsFor(overall), xp, affirmation: affirmation(overall) } });
  },
  next: () => {
    const s = get();
    if (!s.inter) return;
    if (s.inter.next === 'speak') prefetchEpisode();
    set({ step: s.inter.next, inter: null });
  },
  quit: () => set({ active: false, step: 'pick', inter: null, result: null }),
}));

function initPerf(words: Word[]): Record<string, WordPerf> {
  return Object.fromEntries(words.map((w) => [w.id, { g1: false, g2Misses: 0, spoke: false }]));
}

let episodeStartedAt = 0;
/** When the current episode request started (ms), so the loading screen can show the real wait. */
export const episodeWaitStart = () => episodeStartedAt || Date.now();

/** Writes the podcast while the learner is speaking, so it is ready on time. */
export function prefetchEpisode() {
  const s = useLesson.getState();
  if (s.episode || s.episodeLoading) return;
  const p = useProgress.getState();
  episodeStartedAt = Date.now();
  useLesson.setState({ episodeLoading: true });
  const label = s.topic === 'mywords' ? 'a mix of everyday and work topics' : topicName(s.topic);
  getEpisode(s.words, s.topic, label, p.level, p.installId).then((episode) => {
    const now = useLesson.getState();
    if (now.words !== s.words) return;
    // If the learner chose the quick episode while waiting, keep it: don't swap the story mid-listen.
    useLesson.setState(now.episode ? { episodeLoading: false } : { episode, episodeLoading: false });
  });
}

/** Skip the wait and use the offline template episode. */
export function playQuickEpisode() {
  const s = useLesson.getState();
  if (s.episode) return;
  useLesson.setState({ episode: templateEpisode(s.words, s.topic) });
}

export { speakItemScore, LEVELS };
