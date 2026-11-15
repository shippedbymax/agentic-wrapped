import type { LogSource, SkippedLineReporter, UsageEvent } from '../../core';
import { openReadOnlyDatabase } from './open-database';
import { cursorReplyRowSchema } from './schema';

/** Cursor often stores no model name ("auto" mode). */
const UNKNOWN_MODEL = 'cursor-auto';

/**
 * Reads only metadata of AI replies (type 2): time, model and token counts.
 * SQLite extracts these fields itself, so prompts, answers and code never enter this process.
 * `CAST(value AS TEXT)` covers both ways Cursor has stored the JSON (text and blob).
 */
const REPLIES_QUERY = `
  SELECT
    key,
    json_extract(CAST(value AS TEXT), '$.createdAt') AS createdAt,
    json_extract(CAST(value AS TEXT), '$.modelInfo.modelName') AS model,
    json_extract(CAST(value AS TEXT), '$.tokenCount.inputTokens') AS inputTokens,
    json_extract(CAST(value AS TEXT), '$.tokenCount.outputTokens') AS outputTokens
  FROM cursorDiskKV
  WHERE key >= 'bubbleId:' AND key < 'bubbleId;'
    AND json_valid(CAST(value AS TEXT))
    AND json_extract(CAST(value AS TEXT), '$.type') = 2
    AND json_extract(CAST(value AS TEXT), '$.createdAt') IS NOT NULL
`;

/**
 * Cursor's local database has one row per message. Token counts are filled in on a
 * best-effort basis and are zero for most people, so Cursor events often carry no tokens.
 */
export async function* parseCursorLog(
  source: LogSource,
  onSkippedLine?: SkippedLineReporter,
): AsyncGenerator<UsageEvent> {
  const database = openReadOnlyDatabase(source.path);
  let rows: unknown[];
  try {
    rows = database.prepare(REPLIES_QUERY).all();
  } catch {
    throw new Error('Cursor data could not be read (unexpected database layout).');
  } finally {
    database.close();
  }

  for (const row of rows) {
    const parsed = cursorReplyRowSchema.safeParse(row);
    if (!parsed.success) {
      onSkippedLine?.('unexpected Cursor reply shape');
      continue;
    }
    const reply = parsed.data;
    const [, conversationId = ''] = reply.key.split(':');

    yield {
      eventId: reply.key,
      agentId: 'cursor',
      sessionId: conversationId,
      timestamp: new Date(reply.createdAt),
      model: reply.model || UNKNOWN_MODEL,
      inputTokens: Math.max(0, reply.inputTokens ?? 0),
      outputTokens: Math.max(0, reply.outputTokens ?? 0),
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
  }
}
