import * as z from 'zod/v4';

/* ---------- What the app sends ---------- */
const WordIn = z.object({ w: z.string().min(1).max(60), pos: z.string().max(8), def: z.string().max(200) });

export const FeedbackRequest = z.object({
  word: WordIn,
  transcript: z.string().trim().min(1).max(400),
  confidence: z.number().min(-1).max(1).nullable().optional(),
  viaMic: z.boolean().optional(),
  level: z.number().int().min(0).max(3),
});
export type FeedbackRequest = z.infer<typeof FeedbackRequest>;

export const EpisodeRequest = z.object({
  words: z.array(WordIn).min(4).max(10),
  topic: z.string().min(1).max(80),
  level: z.number().int().min(0).max(3),
});
export type EpisodeRequest = z.infer<typeof EpisodeRequest>;

export const ReportRequest = z.object({
  wordId: z.string().min(1).max(60),
  word: z.string().min(1).max(60),
  reason: z.enum(['zh', 'def', 'ex', 'audio', 'other']),
  note: z.string().max(500).default(''),
  where: z.string().max(30).default(''),
  at: z.string().max(40).optional(),
  appVersion: z.string().max(20).optional(),
});
export type ReportRequest = z.infer<typeof ReportRequest>;

/* ---------- What Claude returns (structured output) ---------- */
export const FeedbackOutput = z.object({
  usedTargetWord: z.boolean().describe('True if the sentence contains the target word in any form (postponed, applying, refunds).'),
  meaningCorrect: z.boolean().describe('True only if the target word is used with the given meaning and part of speech AND the sentence makes sense. False for grammatical sentences that use the word with a wrong meaning, in a way that makes no sense, or that do not show what the word means.'),
  meaningExplanation: z.string().describe('If meaningCorrect is false: one or two short sentences in simple English saying what the word really means and how the sentence misuses it, with a short correct example. Empty string if meaningCorrect is true.'),
  meaningExplanationZh: z.string().describe('The same meaning explanation in Traditional Chinese, Taiwan usage. Empty string if meaningCorrect is true.'),
  grammarScore: z.number().describe('0 to 100. 100 = no errors. Minus about 10 to 15 per real error. Do not deduct for style.'),
  issues: z.array(z.object({
    explanation: z.string().describe('One short sentence in simple English, at the learner level.'),
    explanationZh: z.string().describe('The same explanation in Traditional Chinese, Taiwan usage.'),
  })).describe('At most 3 issues, most important first. Empty if the sentence is correct.'),
  correctedSentence: z.string().describe('The learner sentence with only the errors fixed. Same as the original if it is correct.'),
  naturalVersion: z.string().describe('How a native speaker might say it, at the learner level. Same as correctedSentence if already natural.'),
  suspectedMispronunciations: z.array(z.object({
    heard: z.string().describe('The word the speech recognizer produced.'),
    intended: z.string().describe('The word the learner most likely meant.'),
    tip: z.string().describe('One short pronunciation tip in simple English.'),
    tipZh: z.string().describe('The same tip in Traditional Chinese, Taiwan usage.'),
  })).describe('Only when the transcript came from speech and a word looks misheard. At most 2. Empty otherwise.'),
  encouragement: z.string().describe('One warm, specific sentence of encouragement in simple English. No more than 15 words.'),
});
export type FeedbackOutput = z.infer<typeof FeedbackOutput>;

export const EpisodeOutput = z.object({
  title: z.string().describe('A short episode title, 2 to 6 words.'),
  lines: z.array(z.object({
    speaker: z.enum(['Mia', 'Leo']),
    text: z.string().describe('One or two sentences of natural spoken English.'),
  })),
  quiz: z.array(z.object({
    question: z.string(),
    quote: z.string().describe('For fill-in-the-blank questions, the sentence from the episode with the word replaced by "_____". Empty string otherwise.'),
    options: z.array(z.string()).describe('Exactly 4 options.'),
    answer: z.string().describe('Must exactly match one of the options.'),
  })).describe('Exactly 5 questions.'),
});
export type EpisodeOutput = z.infer<typeof EpisodeOutput>;
