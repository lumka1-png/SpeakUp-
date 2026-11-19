import { dayStr } from './util';

export interface Scores { g1: number; g2: number; g3: number; speak: number; listen: number }
/** How the learner did with one word. A missing field means that part was skipped. */
export interface WordPerf { g1?: boolean; g2Misses?: number; spoke?: boolean }

const avg = (xs: (number | undefined)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : undefined;
};
/** Average of the vocabulary games that were played, or undefined if all were skipped. */
export const vocabScore = (s: Partial<Scores>) => avg([s.g1, s.g2, s.g3]);
/** Vocabulary 40%, Speaking 30%, Listening 30%, counting only the parts that were done. */
export function lessonScore(s: Partial<Scores>): number {
  const parts: [number | undefined, number][] = [[vocabScore(s), 0.4], [s.speak, 0.3], [s.listen, 0.3]];
  const done = parts.filter((p): p is [number, number] => p[0] != null);
  const weight = done.reduce((a, [, w]) => a + w, 0);
  return weight ? Math.round(done.reduce((a, [v, w]) => a + v * w, 0) / weight) : 0;
}
export const starsFor = (score: number) => (score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0);
export const xpFor = (score: number, wordCount: number) => score + wordCount * 5;
export const matchScore = (mistakes: number) => Math.max(0, 100 - mistakes * 10);
/** Quick Think: accuracy, scaled down when fewer than 10 answers were given. */
export const quickScore = (correct: number, attempts: number) =>
  attempts ? Math.round((correct / attempts) * 100 * Math.min(1, attempts / 10)) : 0;
/**
 * One speaking item: 60% grammar + 40% pronunciation when recorded, grammar only when typed.
 * A sentence that uses the word with the wrong meaning scores at most 40, however good the grammar.
 */
export function speakItemScore(grammar: number, pron: number | null, meaningOk?: boolean): number {
  const score = pron == null ? grammar : Math.round(grammar * 0.6 + pron * 0.4);
  return meaningOk === false ? Math.min(40, score) : score;
}
export const scoreLabel = (s: number) => (s >= 90 ? 'Outstanding!' : s >= 75 ? 'Great job!' : s >= 60 ? 'Nice work!' : 'Good effort!');

/** New mastery (0 to 3) for a word after a lesson. Skipped parts neither help nor hurt. */
export function nextMastery(current: number, perf: WordPerf): number {
  const results = [perf.g1, perf.g2Misses == null ? undefined : perf.g2Misses === 0, perf.spoke].filter((x): x is boolean => x != null);
  const earned = results.filter(Boolean).length;
  if (earned >= 2) return Math.min(3, current + 1);
  if (results.length && earned === 0) return Math.max(0, current - 1);
  return current;
}

/** Streak after finishing a lesson today. */
export function nextStreak(streak: number, lastDay: string | null, now: Date): { streak: number; lastDay: string } {
  const today = dayStr(now);
  if (lastDay === today) return { streak: Math.max(1, streak), lastDay: today };
  const yesterday = dayStr(new Date(now.getTime() - 86_400_000));
  return { streak: lastDay === yesterday ? streak + 1 : 1, lastDay: today };
}

const AFFIRMATIONS: Record<'a' | 'b' | 'c' | 'd', [string, string][]> = {
  a: [["Outstanding! You're speaking with real confidence.", '太棒了！你的英文越來越有自信了。'], ['Brilliant work! You owned this lesson.', '表現超棒！這一課你完全掌握了。']],
  b: [['Great work! These words are becoming yours.', '做得很好！這些單字正在變成你的。'], ['Strong lesson! Keep this momentum going.', '很棒的一課！保持這個節奏。']],
  c: [['Nice progress! Every lesson makes you stronger.', '進步很多！每一課都讓你更強。'], ['Good job! Practice makes these words stick.', '做得好！多練習就能記得更牢。']],
  d: [['You showed up and practiced, and that is how fluency grows.', '你今天有練習，這就是進步的開始。'], ['Every expert started here. Try these words again tomorrow.', '每個高手都是從這裡開始的。明天再複習一次吧！']],
};
export function affirmation(score: number, rand: () => number = Math.random): [string, string] {
  const band = score >= 90 ? 'a' : score >= 75 ? 'b' : score >= 60 ? 'c' : 'd';
  const list = AFFIRMATIONS[band];
  return list[Math.floor(rand() * list.length)];
}
