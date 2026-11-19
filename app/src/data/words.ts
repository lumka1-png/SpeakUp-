import { COMING_SOON, THEME_LISTS, TOEIC_LISTS } from './wordlists';

export type Level = 0 | 1 | 2 | 3;
export type Pos = 'n.' | 'v.' | 'adj.' | 'adv.' | 'phr.';

export interface Word {
  id: string;
  w: string;
  pos: Pos;
  zh: string;
  def: string;
  ex: string;
  lvl: Level;
  topic: string;
}

export const LEVELS = [
  { name: 'Beginner', cefr: 'A1–A2', toeic: 'below 550', badge: 'A2', blurb: 'Everyday words for work and daily life' },
  { name: 'Intermediate', cefr: 'B1', toeic: '550–780', badge: 'B1', blurb: 'Common workplace and travel vocabulary' },
  { name: 'Advanced', cefr: 'B2', toeic: '785–940', badge: 'B2', blurb: 'Professional words for meetings and reports' },
  { name: 'Expert', cefr: 'C1+', toeic: '945+', badge: 'C1', blurb: 'Precise, high-level business English' },
] as const;

export const THEME_IDS = Object.keys(THEME_LISTS);
export const TOPIC_IDS = ['toeic', ...THEME_IDS];
export { COMING_SOON };

export function parseWord(s: string, lvl: number, topic: string): Word {
  const [w, pos, zh, def, ex] = s.split('|');
  return { id: w.toLowerCase(), w, pos: pos as Pos, zh, def, ex, lvl: lvl as Level, topic };
}

export function wordsOf(topic: string): Word[] {
  if (topic === 'toeic') return TOEIC_LISTS.flatMap((list, l) => list.map((s) => parseWord(s, l, 'toeic')));
  const t = THEME_LISTS[topic];
  if (!t) return [];
  return t.words.map((s, i) => parseWord(s, Math.floor(i / 5), topic));
}

export const ALL_WORDS: Word[] = TOPIC_IDS.flatMap(wordsOf);

export function findWord(id: string): Word | undefined {
  return ALL_WORDS.find((w) => w.id === id);
}

export function topicName(id: string): string {
  if (id === 'toeic') return 'TOEIC Essentials';
  if (id === 'mywords') return 'My Words review';
  if (id === 'random') return 'Random topic';
  return THEME_LISTS[id]?.name ?? id;
}

export function topicColor(id: string): string {
  if (id === 'toeic') return '#1E2140';
  if (id === 'mywords') return '#0E7C74';
  if (id === 'random') return '#575B76';
  return THEME_LISTS[id]?.color ?? '#D24A22';
}

/** Words the learner has not saved yet, closest to their level first. */
export function getPool(level: number, topic: string, saved: Record<string, unknown>): Word[] {
  return wordsOf(topic)
    .filter((w) => !saved[w.id])
    .sort((a, b) => Math.abs(a.lvl - level) - Math.abs(b.lvl - level) || a.lvl - b.lvl);
}
