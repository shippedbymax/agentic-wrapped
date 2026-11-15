import type { LogSource, SkippedLineReporter, UsageEvent } from '../../core';
import { hashProject } from '../shared/hash-project';
import { readLines } from '../shared/read-lines';
import { claudeCodeAssistantLineSchema } from './schema';

/** Placeholder model Claude Code writes for locally generated messages. Not a real call. */
const SYNTHETIC_MODEL = '<synthetic>';

export async function* parseClaudeCodeLog(
  source: LogSource,
  onSkippedLine?: SkippedLineReporter,
): AsyncGenerator<UsageEvent> {
  for await (const { text, lineNumber } of readLines(source.path)) {
    // Cheap pre-filter: most lines are user messages or tool results and carry no usage.
    if (!text.includes('"usage"') || !text.includes('"assistant"')) continue;

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      onSkippedLine?.('invalid JSON');
      continue;
    }

    const parsed = claudeCodeAssistantLineSchema.safeParse(json);
    if (!parsed.success) {
      const isAssistantLine = (json as { type?: unknown } | null)?.type === 'assistant';
      if (isAssistantLine) onSkippedLine?.('unexpected assistant line shape');
      continue;
    }

    const line = parsed.data;
    if (line.message.model === SYNTHETIC_MODEL) continue;

    // One API response is written once per content block; message id + request id identify it.
    const eventId =
      line.message.id && line.requestId
        ? `${line.message.id}:${line.requestId}`
        : `${line.sessionId}:${lineNumber}`;

    yield {
      eventId,
      agentId: 'claude-code',
      sessionId: line.sessionId,
      timestamp: new Date(line.timestamp),
      model: line.message.model,
      inputTokens: line.message.usage.input_tokens,
      outputTokens: line.message.usage.output_tokens,
      cacheReadTokens: line.message.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: line.message.usage.cache_creation_input_tokens ?? 0,
      ...(line.cwd ? { projectHash: hashProject(line.cwd) } : {}),
    };
  }
}
