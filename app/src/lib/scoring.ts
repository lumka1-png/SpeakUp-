import { dayStr } from './util';

export interface Scores { g1: number; g2: number; g3: number; speak: number; listen: number }
export interface WordPerf { g1: boolean; g2Misses: number; spoke: boolean }

export const vocabScore = (s: Pick<Scores, 'g1' | 'g2' | 'g3'>) => Math.round((s.g1 + s.g2 + s.g3) / 3);
export const lessonScore = (s: Scores) => Math.round(vocabScore(s) * 0.4 + s.speak * 0.3 + s.listen * 0.3);
export const starsFor = (score: number) => (score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0);
export const xpFor = (score: number, wordCount: number) => score + wordCount * 5;
export const matchScore = (mistakes: number) => Math.max(0, 100 - mistakes * 10);
/** Quick Think: accuracy, scaled down when fewer than 10 answers were given. */
export const quickScore = (correct: number, attempts: number) =>
  attempts ? Math.round((correct / attempts) * 100 * Math.min(1, attempts / 10)) : 0;
/** One speaking item: 60% grammar + 40% pronunciation when recorded, grammar only when typed. */
export const speakItemScore = (grammar: number, pron: number | null) => (pron == null ? grammar : Math.round(grammar * 0.6 + pron * 0.4));
export const scoreLabel = (s: number) => (s >= 90 ? 'Outstanding!' : s >= 75 ? 'Great job!' : s >= 60 ? 'Nice work!' : 'Good effort!');

/** New mastery (0 to 3) for a word after a lesson. */
export function nextMastery(current: number, perf: WordPerf): number {
  const earned = (perf.g1 ? 1 : 0) + (perf.g2Misses === 0 ? 1 : 0) + (perf.spoke ? 1 : 0);
  if (earned >= 2) return Math.min(3, current + 1);
  if (earned === 0) return Math.max(0, current - 1);
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
