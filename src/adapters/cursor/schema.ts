import { z } from 'zod';

/**
 * One row of the query in `parse.ts`: the metadata of one AI reply ("bubble").
 * The message text is never selected.
 */
export const cursorReplyRowSchema = z.object({
  /** `bubbleId:<conversation id>:<reply id>` */
  key: z.string().regex(/^bubbleId:[^:]+:.+$/),
  /** ISO string in current versions, epoch milliseconds in some older ones. */
  createdAt: z.union([z.string().min(1), z.number()]),
  model: z.string().nullable(),
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
});
