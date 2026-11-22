/**
 * Offline speaking feedback: simple grammar rules and pronunciation tips for
 * Mandarin speakers. Used when no API server is configured, or when the
 * server cannot be reached. The server version (Claude) is far more capable.
 */
import { escRe } from './util';

export interface Issue { msg: string; zh: string }
export interface SoundTip { key: string; en: string; zh: string }
export interface Mispronunciation { heard: string; intended: string; tip: string; tipZh: string }

export interface Feedback {
  source: 'claude' | 'local';
  original: string;
  corrected: string;
  natural?: string;
  issues: Issue[];
  usedWord: boolean;
  /** false when the word is used with the wrong meaning; undefined when meaning was not checked (offline). */
  meaningOk?: boolean;
  /** True when the server is set up but Claude could not check this sentence, so this is the offline check. */
  serverFailed?: boolean;
  /** Why the meaning is wrong, when meaningOk is false. */
  meaningNote?: Issue;
  grammarScore: number;
  /** null when the sentence was typed, so pronunciation was not measured. */
  pronScore: number | null;
  mispronunciations: Mispronunciation[];
  soundTips: SoundTip[];
  encouragement?: string;
}

const VERB3: Record<string, string> = {
  go: 'goes', have: 'has', do: 'does', want: 'wants', like: 'likes', need: 'needs', work: 'works', make: 'makes',
  take: 'takes', get: 'gets', say: 'says', think: 'thinks', use: 'uses', come: 'comes', know: 'knows', buy: 'buys',
  try: 'tries', study: 'studies', watch: 'watches', live: 'lives', love: 'loves', play: 'plays', feel: 'feels',
  see: 'sees', eat: 'eats', pay: 'pays', plan: 'plans', spend: 'spends', save: 'saves',
};

export function usesWord(text: string, word: string): boolean {
  let stem = word.toLowerCase();
  if (stem.length > 4 && !stem.includes(' ')) stem = stem.replace(/(e|y)$/, '');
  return new RegExp('\\b' + escRe(stem), 'i').test(text);
}

export interface GrammarResult { original: string; corrected: string; issues: Issue[]; usedWord: boolean; grammarScore: number }

export function checkGrammar(text: string, word: string): GrammarResult | null {
  let s = text.trim().replace(/\s+/g, ' ');
  if (!s) return null;
  const issues: Issue[] = [];
  const add = (msg: string, zh: string) => issues.push({ msg, zh });

  s = s.replace(/\b(\w+)\s+\1\b/gi, (_m, a: string) => { add(`You repeated “${a}”.`, '注意不要重複同一個字。'); return a; });
  if (/\bi\b/.test(s)) { s = s.replace(/\bi\b/g, 'I'); add('Always write “I” with a capital letter.', '英文的「I（我）」永遠要大寫。'); }
  s = s.replace(/\bI\s+(is|are)\b/g, () => { add('Use “am” after “I”.', '「I」後面要用 am。'); return 'I am'; });
  s = s.replace(/\b(he|she|it)\s+(are|am)\b/gi, (_m, a: string) => { add(`Use “is” after “${a.toLowerCase()}”.`, 'he / she / it 後面要用 is。'); return `${a} is`; });
  s = s.replace(/\b(you|we|they)\s+(is|am)\b/gi, (_m, a: string) => { add(`Use “are” after “${a.toLowerCase()}”.`, 'you / we / they 後面要用 are。'); return `${a} are`; });
  s = s.replace(/\b(he|she|it)\s+(\w+)\b/gi, (m, a: string, b: string) => {
    const v = VERB3[b.toLowerCase()];
    if (!v) return m;
    add(`After “${a.toLowerCase()}”, use “${v}” in the present tense.`, '第三人稱單數（he / she / it）的現在式動詞要加 -s。');
    return `${a} ${v}`;
  });
  s = s.replace(/\b(want|wants|need|needs|plan|plans|hope|hopes|decide|decided|wanted|needed|planned)\s+(go|buy|eat|see|make|have|get|do|work|meet|try|visit|book|find|learn|study|talk|pay|use|save|spend)\b/gi,
    (_m, a: string, b: string) => { add(`Add “to” after “${a.toLowerCase()}”: “${a.toLowerCase()} to ${b}”.`, 'want / need / plan 後面接動詞時，要加 to。'); return `${a} to ${b}`; });
  s = s.replace(/\b([Aa])\s+([aeiou]\w*)/gi, (m, a: string, b: string) => {
    if (/^(uni|use|usu|uti|euro|one|once)/i.test(b)) return m;
    add(`Use “an” before a vowel sound: “an ${b}”.`, '母音開頭的字前面要用 an。');
    return `${a === 'A' ? 'An' : 'an'} ${b}`;
  });
  s = s.replace(/\b([Aa])n\s+([bcdfgjklmnpqrstvwxyz]\w*)/gi, (_m, a: string, b: string) => {
    add(`Use “a” before a consonant sound: “a ${b}”.`, '子音開頭的字前面要用 a。');
    return `${a} ${b}`;
  });
  if (/^[a-z]/.test(s)) { s = s[0].toUpperCase() + s.slice(1); add('Start your sentence with a capital letter.', '句子開頭的第一個字母要大寫。'); }
  if (!/[.!?]["”']?$/.test(s)) { s += '.'; add('End your sentence with a period, question mark, or exclamation point.', '句子結尾要加上標點符號。'); }

  const wc = s.split(/\s+/).length;
  const used = usesWord(text, word);
  const tips: Issue[] = [];
  if (!used) tips.push({ msg: `Your sentence doesn't use “${word}” yet. Try again with the word.`, zh: `記得在句子裡用到「${word}」。` });
  if (wc < 5) tips.push({ msg: 'Try a longer sentence (five words or more) so the meaning is clear.', zh: '試著說長一點的句子，讓意思更清楚。' });
  const grammarScore = Math.max(25, Math.min(100, 100 - issues.length * 12 - (used ? 0 : 30) - (wc < 5 ? 10 : 0)));
  return { original: text.trim(), corrected: s, issues: [...tips, ...issues], usedWord: used, grammarScore };
}

export function soundTips(word: string): SoundTip[] {
  const t: SoundTip[] = [];
  const x = word.toLowerCase();
  if (/th/.test(x)) t.push({ key: 'TH', en: 'Put your tongue lightly between your teeth for “th”. It is not “s” or “f”.', zh: '發「th」時，舌尖輕放在上下牙齒之間，不要發成 s 或 f。' });
  if (/v/.test(x)) t.push({ key: 'V', en: 'For “v”, touch your top teeth to your bottom lip and use your voice. It is not “w”.', zh: '發 v 時，上排牙齒輕碰下唇並振動聲帶，不要發成 w。' });
  if (/r/.test(x) && /l/.test(x)) t.push({ key: 'R and L', en: 'Keep “r” and “l” different. Curl your tongue back for “r”; touch behind your top teeth for “l”.', zh: 'r 舌頭往後捲；l 舌尖碰上排牙齒後方。兩個音要分清楚。' });
  if (/(tion|sion)$/.test(x)) t.push({ key: '-tion', en: 'Say “-tion” like “shun”, with a soft ending.', zh: '字尾 -tion 唸作「shun」。' });
  if (/[bdgkpt]s?$/.test(x) && !x.includes(' ')) t.push({ key: 'Final sound', en: "Say the last consonant clearly. Don't drop it, and don't add a vowel after it.", zh: '字尾子音要清楚發出來，不要省略，也不要多加母音。' });
  if (x.includes(' ')) t.push({ key: 'Linking', en: 'Link the words smoothly, as if they were one long word.', zh: '片語要連在一起唸，聽起來像一個長字。' });
  if (!t.length) t.push({ key: 'Stress', en: 'Listen to the model and copy which syllable is the strongest.', zh: '仔細聽示範，模仿哪一個音節要重讀。' });
  return t.slice(0, 2);
}

/**
 * Pronunciation estimate from speech recognition. `confidence` is 0 to 1, or
 * null/negative when the platform does not report it.
 */
export function estimatePronunciation(confidence: number | null, usedWord: boolean): number {
  let p = confidence != null && confidence > 0 ? Math.round(confidence * 100) : 85;
  if (!usedWord) p -= 20;
  return Math.max(40, Math.min(100, p));
}

/**
 * Word-by-word comparison for the "read it back" step: how much of the target
 * sentence the recognizer heard. Returns 0 to 100 and the words it missed.
 */
export function readBackScore(target: string, heard: string): { score: number; missed: string[] } {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
  const t = norm(target);
  const h = norm(heard);
  if (!t.length) return { score: 0, missed: [] };
  // Longest common subsequence keeps word order.
  const dp = Array.from({ length: t.length + 1 }, () => new Array<number>(h.length + 1).fill(0));
  for (let i = 1; i <= t.length; i++)
    for (let j = 1; j <= h.length; j++)
      dp[i][j] = t[i - 1] === h[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const matched = new Set<number>();
  for (let i = t.length, j = h.length; i > 0 && j > 0; ) {
    if (t[i - 1] === h[j - 1]) { matched.add(i - 1); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  const missed = t.filter((_, i) => !matched.has(i));
  const extra = Math.max(0, h.length - matched.size);
  const score = Math.round((matched.size / (t.length + extra * 0.5)) * 100);
  return { score: Math.max(0, Math.min(100, score)), missed };
}

export function localFeedback(text: string, word: string, confidence: number | null, viaMic: boolean): Feedback | null {
  const g = checkGrammar(text, word);
  if (!g) return null;
  return {
    source: 'local',
    original: g.original,
    corrected: g.corrected,
    issues: g.issues,
    usedWord: g.usedWord,
    grammarScore: g.grammarScore,
    pronScore: viaMic ? estimatePronunciation(confidence, g.usedWord) : null,
    mispronunciations: [],
    soundTips: soundTips(word),
  };
}
