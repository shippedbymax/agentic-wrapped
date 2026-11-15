import { z } from 'zod';

const tokenCount = z.number().int().nonnegative();

/** An assistant line in `~/.claude/projects/<project>/<session>.jsonl`. Only the fields we read. */
export const claudeCodeAssistantLineSchema = z.object({
  type: z.literal('assistant'),
  sessionId: z.string().min(1),
  timestamp: z.string().min(1),
  cwd: z.string().optional(),
  requestId: z.string().optional(),
  message: z.object({
    id: z.string().optional(),
    model: z.string().min(1),
    usage: z.object({
      input_tokens: tokenCount,
      output_tokens: tokenCount,
      cache_creation_input_tokens: tokenCount.optional(),
      cache_read_input_tokens: tokenCount.optional(),
    }),
  }),
});

export type ClaudeCodeAssistantLine = z.infer<typeof claudeCodeAssistantLineSchema>;
