import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

import { EPISODE_SYSTEM, episodeUserMessage, FEEDBACK_SYSTEM, feedbackUserMessage } from './prompts';
import { type EpisodeOutput, EpisodeOutput as EpisodeSchema, type EpisodeRequest, type FeedbackOutput, FeedbackOutput as FeedbackSchema, type FeedbackRequest } from './schemas';

/** The model is configurable so you can compare quality and cost (for example claude-opus-5-5 for richer episodes). */
export const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-5-5';

/** The Claude API key. SPEAKUP_CLAUDE_KEY is preferred (it does not clash with other tools that read ANTHROPIC_API_KEY). */
export const apiKey = () => process.env.SPEAKUP_CLAUDE_KEY || process.env.ANTHROPIC_API_KEY || '';

/** Thrown when Claude declines or returns output that cannot be used. The app then uses its offline fallback. */
export class AiUnavailable extends Error {}

export interface Ai {
  feedback(req: FeedbackRequest): Promise<FeedbackOutput>;
  episode(req: EpisodeRequest): Promise<EpisodeOutput>;
}

export function createClaudeAi(injected?: Anthropic): Ai {
  let client: Anthropic | undefined = injected;
  const getClient = () => {
    if (!client) {
      const key = apiKey();
      if (!key) throw new AiUnavailable('no Claude API key (set SPEAKUP_CLAUDE_KEY)');
      try { client = new Anthropic({ apiKey: key, maxRetries: 2 }); } catch (e) { throw new AiUnavailable(`Claude client not configured: ${(e as Error).message}`); }
    }
    return client;
  };
  // Server-side refusal fallbacks are supported on Opus and Sonnet models, not Haiku.
  const fallback = /haiku/.test(MODEL) ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };

  async function run<T>(system: string, user: string, format: ReturnType<typeof betaZodOutputFormat>, effort: 'low' | 'medium', maxTokens: number, timeoutMs: number): Promise<T> {
    const res = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: maxTokens,
      ...fallback,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
      output_config: { effort, format },
    }, { timeout: timeoutMs });
    if (res.stop_reason === 'refusal') throw new AiUnavailable(`refused: ${res.stop_details?.category ?? 'unknown'}`);
    if (res.stop_reason === 'max_tokens') throw new AiUnavailable('output was cut off');
    if (!res.parsed_output) throw new AiUnavailable('no parsed output');
    return res.parsed_output as T;
  }

  return {
    feedback: (req) => run<FeedbackOutput>(FEEDBACK_SYSTEM, feedbackUserMessage(req), betaZodOutputFormat(FeedbackSchema), 'low', 4000, 30_000),
    episode: async (req) => {
      const out = await run<EpisodeOutput>(EPISODE_SYSTEM, episodeUserMessage(req), betaZodOutputFormat(EpisodeSchema), 'medium', 16000, 120_000);
      return cleanEpisode(out, req);
    },
  };
}

/** Light checks so the app never shows a broken quiz. */
export function cleanEpisode(out: EpisodeOutput, req: EpisodeRequest): EpisodeOutput {
  const lines = out.lines.filter((l) => l.text.trim());
  const quiz = out.quiz.filter((q) => q.options.length >= 2 && q.options.includes(q.answer)).slice(0, 5);
  if (lines.length < 10 || quiz.length < 3) throw new AiUnavailable('episode failed validation');
  const text = lines.map((l) => l.text.toLowerCase()).join(' ');
  const missing = req.words.filter((w) => !text.includes(w.w.toLowerCase().split(' ')[0]));
  if (missing.length > 2) throw new AiUnavailable(`episode is missing words: ${missing.map((w) => w.w).join(', ')}`);
  return { title: out.title, lines, quiz };
}
