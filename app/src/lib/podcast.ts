import { PODCAST_NAME } from '../config';
import { topicName, type Word } from '../data/words';
import { cap, pick, shuffle, wordRe } from './util';

export type Host = 'Mia' | 'Leo';
export interface PodLine { sp: Host; t: string; slow?: boolean }
export interface QuizQ { prompt: string; quote?: string; answer: string; options: string[] }
export interface Episode { title: string; lines: PodLine[]; quiz: QuizQ[]; source: 'claude' | 'template' }

const intro = [
  (w: Word) => `So, here's something that happened this week. ${w.ex}`,
  (w: Word) => `I heard a great sentence today. ${w.ex}`,
  (w: Word) => `Okay, next one. Imagine someone says this to you: ${w.ex}`,
  (w: Word) => `Here's an example from real life. ${w.ex}`,
  (w: Word) => `Let me tell you about my week. ${w.ex}`,
];
const react = ['Good word.', 'I like that one.', "That's a really useful one.", 'This one comes up a lot.', 'Nice choice.'];
const posTip: Record<string, (w: Word) => string> = {
  'n.': (w) => `It's a noun, so you can talk about "the ${w.w}".`,
  'v.': () => "It's a verb, so you can use it in the past tense when you tell a story about yesterday.",
  'adj.': () => "It's an adjective, so it describes a person or a thing.",
  'adv.': () => "It's an adverb. You often hear it at the start of a sentence.",
  'phr.': () => "It's a phrase, so learn it as one chunk. Native speakers use it all the time.",
};
const memo = ['Try saying it out loud three times.', 'Write it in your notebook tonight.', 'Try to use it in a message to a friend this week.', 'Notice when you hear it in movies or at work.', 'Say it slowly first, then a little faster.'];

/** Offline episode built from templates. The server version asks Claude for a fresh story. */
export function templateEpisode(words: Word[], topic: string): Episode {
  const lines: PodLine[] = [];
  const L = (sp: Host, t: string, slow = false) => lines.push({ sp, t, slow });
  const tn = topic === 'mywords' ? 'your saved words' : topicName(topic).toLowerCase();
  L('Mia', `Hi everyone, and welcome to ${PODCAST_NAME}, the five-minute English show where you hear new words in real conversation. I'm Mia.`);
  L('Leo', `And I'm Leo. Today we're talking about ${tn}, and we have ${words.length} useful words for you. Listen carefully, because there's a short quiz at the end.`);
  L('Mia', "That's right. Don't worry if you don't catch everything the first time. Just relax and listen for the words you chose.");
  words.forEach((w, i) => {
    const a: Host = i % 2 ? 'Leo' : 'Mia';
    const b: Host = i % 2 ? 'Mia' : 'Leo';
    L(a, intro[i % intro.length](w));
    L(b, `${cap(w.w)}. ${react[i % react.length]} ${cap(w.w)} means ${w.def}.`);
    L(a, `${(posTip[w.pos] ?? posTip['phr.'])(w)} ${memo[i % memo.length]}`);
    L(b, `Let me say it slowly for our listeners. ${w.ex}`, true);
  });
  L('Mia', `Let's do a quick review. Today's words were: ${words.map((w) => w.w).join(', ')}.`);
  L('Leo', `Great job listening today. Now try the quiz and see how much you remember. See you next time on ${PODCAST_NAME}!`);
  return { title: topic === 'mywords' ? 'Your saved words' : topicName(topic), lines, quiz: templateQuiz(words), source: 'template' };
}

export function templateQuiz(words: Word[], rand: () => number = Math.random): QuizQ[] {
  const qs: QuizQ[] = [];
  const ws = shuffle(words, rand);
  const others = (w: Word) => pick(words.filter((x) => x.id !== w.id), 3, rand).map((x) => x.w);
  ws.filter((w) => wordRe(w.w).test(w.ex)).slice(0, 3).forEach((w) =>
    qs.push({ prompt: 'Complete the sentence you heard in the podcast.', quote: w.ex.replace(wordRe(w.w), '_____'), answer: w.w, options: shuffle([w.w, ...others(w)], rand) }));
  ws.filter((w) => !qs.some((q) => q.answer === w.w)).slice(0, 5 - qs.length).forEach((w) =>
    qs.push({ prompt: `One of the hosts explained a word as “${w.def}.” Which word was it?`, answer: w.w, options: shuffle([w.w, ...others(w)], rand) }));
  return shuffle(qs, rand);
}

const WPM = 150;
const lineWords = (l: PodLine) => l.t.split(/\s+/).length * (l.slow ? 1.25 : 1);
/** Estimated seconds of audio before line `upto`, at playback `rate`. */
export function episodeSeconds(lines: PodLine[], upto: number, rate: number): number {
  let n = 0;
  for (let i = 0; i < Math.min(upto, lines.length); i++) n += lineWords(lines[i]);
  return (n / (WPM * rate)) * 60;
}

/** Ids of lesson words that appear in a line. */
export function wordsInLine(line: string, words: Word[]): string[] {
  return words.filter((w) => wordRe(w.w).test(line)).map((w) => w.id);
}
