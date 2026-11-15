import { z } from 'zod';

const tokenCount = z.number().int().nonnegative();

const codexTokenUsageSchema = z.object({
  input_tokens: tokenCount,
  cached_input_tokens: tokenCount.optional(),
  output_tokens: tokenCount,
  reasoning_output_tokens: tokenCount.optional(),
  total_tokens: tokenCount.optional(),
});
export type CodexTokenUsage = z.infer<typeof codexTokenUsageSchema>;

/** Lines in `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`. Only the three kinds we read. */
export const codexLineSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('session_meta'),
    payload: z.object({ id: z.string().optional(), cwd: z.string().optional() }),
  }),
  z.object({
    type: z.literal('turn_context'),
    payload: z.object({ model: z.string().optional(), cwd: z.string().optional() }),
  }),
  z.object({
    type: z.literal('event_msg'),
    timestamp: z.string().min(1),
    payload: z.object({
      type: z.literal('token_count'),
      info: z
        .object({
          total_token_usage: codexTokenUsageSchema.optional(),
          last_token_usage: codexTokenUsageSchema.optional(),
        })
        .nullish(),
    }),
  }),
]);
