import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Word } from '../data/words';
import type { WordReport } from '../lib/api';
import { nextMastery, nextStreak, type WordPerf } from '../lib/scoring';

export interface SavedWord extends Word { mastery: number; added: number; seen: number | null }
export interface HistoryItem { d: string; topic: string; score: number }
export interface Stats { lessons: number; xp: number; streak: number; lastDay: string | null; best: number }

interface ProgressState {
  hydrated: boolean;
  installId: string;
  onboarded: boolean;
  level: number;
  topic: string;
  myWords: Record<string, SavedWord>;
  stats: Stats;
  history: HistoryItem[];
  reports: WordReport[];
  finishOnboarding: (level: number) => void;
  setLevel: (level: number) => void;
  setTopic: (topic: string) => void;
  saveWords: (words: Word[]) => void;
  unsaveWord: (id: string) => void;
  recordLesson: (p: { topic: string; score: number; xp: number; perf: Record<string, WordPerf> }) => void;
  addReport: (r: Omit<WordReport, 'key' | 'at' | 'sent'>) => void;
  markReportsSent: (keys: string[]) => void;
  reset: () => void;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const initial = () => ({
  onboarded: false,
  level: 1,
  topic: 'toeic',
  myWords: {} as Record<string, SavedWord>,
  stats: { lessons: 0, xp: 0, streak: 0, lastDay: null, best: 0 } as Stats,
  history: [] as HistoryItem[],
  reports: [] as WordReport[],
});

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      hydrated: false,
      installId: newId(),
      ...initial(),
      finishOnboarding: (level) => set({ level, onboarded: true }),
      setLevel: (level) => set({ level }),
      setTopic: (topic) => set({ topic }),
      saveWords: (words) =>
        set((s) => {
          const now = Date.now();
          const myWords = { ...s.myWords };
          // A word already in My Words (for example one the learner typed again) keeps its progress.
          words.forEach((w, k) => { myWords[w.id] = myWords[w.id] ?? { ...w, mastery: 0, added: now + k, seen: null }; });
          return { myWords };
        }),
      unsaveWord: (id) =>
        set((s) => {
          const myWords = { ...s.myWords };
          delete myWords[id];
          return { myWords };
        }),
      recordLesson: ({ topic, score, xp, perf }) =>
        set((s) => {
          const now = new Date();
          const st = nextStreak(s.stats.streak, s.stats.lastDay, now);
          const myWords = { ...s.myWords };
          Object.entries(perf).forEach(([id, p]) => {
            const m = myWords[id];
            if (m) myWords[id] = { ...m, mastery: nextMastery(m.mastery, p), seen: now.getTime() };
          });
          return {
            myWords,
            stats: { lessons: s.stats.lessons + 1, xp: s.stats.xp + xp, streak: st.streak, lastDay: st.lastDay, best: Math.max(s.stats.best, score) },
            history: [{ d: st.lastDay, topic, score }, ...s.history].slice(0, 30),
          };
        }),
      addReport: (r) => set((s) => ({ reports: [...s.reports, { ...r, key: newId(), at: new Date().toISOString(), sent: false }] })),
      markReportsSent: (keys) => set((s) => ({ reports: s.reports.map((r) => (keys.includes(r.key) ? { ...r, sent: true } : r)) })),
      reset: () => set({ ...initial() }),
    }),
    {
      name: 'speakup.progress.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated: _h, ...rest }) => rest,
      onRehydrateStorage: () => () => useProgress.setState({ hydrated: true }),
    },
  ),
);
