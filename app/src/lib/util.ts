export function shuffle<T>(arr: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const pick = <T,>(arr: readonly T[], n: number, rand: () => number = Math.random): T[] => shuffle(arr, rand).slice(0, n);
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Matches the word at a word boundary, including endings like -s, -ed, -ing. */
export const wordRe = (w: string, flags = 'i') => new RegExp('\\b' + escRe(w) + '\\w*', flags);
export const dayStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fmtTime = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}`;
