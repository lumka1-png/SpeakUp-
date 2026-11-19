import { PODCAST_NAME } from '../config';
import { topicName, type Word } from '../data/words';
import { pick, shuffle, wordRe } from './util';

export type Host = 'Mia' | 'Leo';
export interface PodLine { sp: Host; t: string; slow?: boolean }
export interface QuizQ { prompt: string; quote?: string; answer: string; options: string[] }
export interface Episode { title: string; lines: PodLine[]; quiz: QuizQ[]; source: 'claude' | 'template' }

/** How the hosts open and close the chat for each topic. The show is a normal talk show, not a lesson. */
const SETTINGS: Record<string, { open: string; reply: string; close: string }> = {
  toeic: { open: 'Leo, you look tired. Busy week at work?', reply: 'So busy. Let me tell you about it.', close: "Well, I hope next week at work is calmer for both of us." },
  office: { open: 'Leo, how are things at the new office?', reply: 'Honestly? A little chaotic. Here is what happened.', close: 'Same time next week, and hopefully with fewer office stories.' },
  business: { open: 'Leo, I heard your cousin is starting a business. How is it going?', reply: 'It is a wild ride. Listen to this.', close: 'Tell your cousin good luck from me.' },
  travel: { open: 'Leo, you just got back from a trip, right? How was it?', reply: 'Great, but a few things went wrong. Here is the story.', close: 'Next time, I am coming with you.' },
  shopping: { open: 'Leo, is that a new jacket? Did you go shopping?', reply: 'I did, and it was quite an adventure.', close: 'Maybe we should go shopping together next weekend.' },
  finance: { open: 'Leo, are you still trying to save money this year?', reply: 'Trying is the right word. Let me explain.', close: 'Okay, I am going to check my budget tonight.' },
  conversation: { open: 'Leo, what is new with you? We have not talked in ages.', reply: 'So much! Where do I start?', close: 'It was great to catch up, Leo.' },
  movies: { open: 'Leo, did you see any good movies this week?', reply: 'I did, and I have a lot to say.', close: 'Okay, movie night at your place next Friday.' },
  music: { open: 'Leo, what have you been listening to lately?', reply: 'Oh, I have a story about that.', close: 'Send me that playlist after the show.' },
};
const DEFAULT_SETTING = { open: 'Leo, how was your week?', reply: 'Interesting! A lot happened.', close: 'Let us talk again next week.' };
const LEAD = ['So, here is the first thing.', 'Oh, and then this happened.', 'Okay, you will like this part.', 'And guess what?', 'Then, on the last day,'];
const REACT = ['Really? Then what?', 'Ha! That sounds familiar.', 'Wait, seriously?', 'Oh no. How did that go?', 'Wow. I did not expect that.'];
const FOLLOW = ['Yeah, it was a small thing, but I keep thinking about it.', 'Exactly. That is what I said too.', 'I know! It worked out in the end, though.', 'Pretty well, actually. Better than I thought.', 'Me neither. It was a surprise.'];

/** Offline episode built from templates. The server version asks Claude for a fresh story. */
export function templateEpisode(words: Word[], topic: string): Episode {
  const lines: PodLine[] = [];
  const L = (sp: Host, t: string) => lines.push({ sp, t });
  const set = SETTINGS[topic] ?? DEFAULT_SETTING;
  L('Mia', `Hi, and welcome back to ${PODCAST_NAME}. I'm Mia.`);
  L('Leo', "And I'm Leo. Good to be here.");
  L('Mia', set.open);
  L('Leo', set.reply);
  words.forEach((w, i) => {
    const a: Host = i % 2 ? 'Mia' : 'Leo';
    const b: Host = i % 2 ? 'Leo' : 'Mia';
    L(a, `${LEAD[i % LEAD.length]} ${w.ex}`);
    L(b, REACT[i % REACT.length]);
    L(a, FOLLOW[i % FOLLOW.length]);
  });
  L('Mia', set.close);
  L('Leo', `Thanks for listening to ${PODCAST_NAME}. See you next time!`);
  return { title: topic === 'mywords' ? 'Catching Up' : topicName(topic), lines, quiz: templateQuiz(words), source: 'template' };
}

export function templateQuiz(words: Word[], rand: () => number = Math.random): QuizQ[] {
  const qs: QuizQ[] = [];
  const ws = shuffle(words, rand);
  const others = (w: Word) => pick(words.filter((x) => x.id !== w.id), 3, rand).map((x) => x.w);
  ws.filter((w) => wordRe(w.w).test(w.ex)).slice(0, 3).forEach((w) =>
    qs.push({ prompt: 'Complete the sentence you heard in the podcast.', quote: w.ex.replace(wordRe(w.w), '_____'), answer: w.w, options: shuffle([w.w, ...others(w)], rand) }));
  ws.filter((w) => !qs.some((q) => q.answer === w.w)).slice(0, 5 - qs.length).forEach((w) =>
    qs.push({ prompt: `Which of your words means “${w.def}”?`, answer: w.w, options: shuffle([w.w, ...others(w)], rand) }));
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
