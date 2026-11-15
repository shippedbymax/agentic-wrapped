import { basename } from 'node:path';
import type { LogSource, SkippedLineReporter, UsageEvent } from '../../core';
import { hashProject } from '../shared/hash-project';
import { readLines } from '../shared/read-lines';
import { type CodexTokenUsage, codexLineSchema } from './schema';

const UNKNOWN_MODEL = 'unknown';
const RELEVANT_MARKERS = ['"token_count"', '"turn_context"', '"session_meta"'];

function subtractUsage(
  current: CodexTokenUsage,
  previous: CodexTokenUsage | undefined,
): CodexTokenUsage {
  const diff = (now: number | undefined, before: number | undefined) =>
    Math.max(0, (now ?? 0) - (before ?? 0));
  return {
    input_tokens: diff(current.input_tokens, previous?.input_tokens),
    cached_input_tokens: diff(current.cached_input_tokens, previous?.cached_input_tokens),
    output_tokens: diff(current.output_tokens, previous?.output_tokens),
  };
}

function isSameUsage(a: CodexTokenUsage, b: CodexTokenUsage | undefined): boolean {
  return (
    b !== undefined &&
    a.input_tokens === b.input_tokens &&
    a.output_tokens === b.output_tokens &&
    (a.cached_input_tokens ?? 0) === (b.cached_input_tokens ?? 0)
  );
}

/**
 * Codex writes a cumulative counter (`total_token_usage`) and, on newer versions,
 * the last call (`last_token_usage`). The same counter is often written twice, so a
 * `token_count` whose total did not move is a duplicate and is skipped.
 */
export async function* parseCodexLog(
  source: LogSource,
  onSkippedLine?: SkippedLineReporter,
): AsyncGenerator<UsageEvent> {
  let sessionId = basename(source.path, '.jsonl');
  let model = UNKNOWN_MODEL;
  let projectHash: string | undefined;
  let previousTotal: CodexTokenUsage | undefined;

  for await (const { text, lineNumber } of readLines(source.path)) {
    // Cheap pre-filter: tool output lines can be megabytes and are never needed.
    if (!RELEVANT_MARKERS.some((marker) => text.includes(marker))) continue;

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      onSkippedLine?.('invalid JSON');
      continue;
    }

    const parsed = codexLineSchema.safeParse(json);
    if (!parsed.success) continue;
    const line = parsed.data;

    if (line.type === 'session_meta') {
      if (line.payload.id) sessionId = line.payload.id;
      if (line.payload.cwd) projectHash = hashProject(line.payload.cwd);
      continue;
    }
    if (line.type === 'turn_context') {
      if (line.payload.model) model = line.payload.model;
      if (line.payload.cwd) projectHash = hashProject(line.payload.cwd);
      continue;
    }

    const info = line.payload.info;
    if (!info) continue;
    const total = info.total_token_usage;
    if (total && isSameUsage(total, previousTotal)) continue;

    const usage =
      info.last_token_usage ?? (total ? subtractUsage(total, previousTotal) : undefined);
    if (total) previousTotal = total;
    if (!usage) continue;

    // OpenAI counts cached tokens inside input_tokens; we keep them apart.
    const cacheReadTokens = Math.min(usage.cached_input_tokens ?? 0, usage.input_tokens);
    if (usage.input_tokens + usage.output_tokens === 0) continue;

    yield {
      eventId: `${sessionId}:${lineNumber}`,
      agentId: 'codex',
      sessionId,
      timestamp: new Date(line.timestamp),
      model,
      inputTokens: usage.input_tokens - cacheReadTokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens,
      cacheWriteTokens: 0,
      ...(projectHash ? { projectHash } : {}),
    };
  }
}
