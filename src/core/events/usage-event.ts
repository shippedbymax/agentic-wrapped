/** Every agent the tool knows about. Add a new id here when adding an adapter. */
export const AGENT_IDS = ['claude-code', 'codex'] as const;
export type AgentId = (typeof AGENT_IDS)[number];

/** Typed as a full record, so a new `AgentId` without a name fails to compile. */
export const AGENT_DISPLAY_NAMES: Readonly<Record<AgentId, string>> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
};

/**
 * One model call, normalized. This is the only shape the core understands.
 *
 * Privacy by design: there is no field for prompts, code or file names.
 * What is not in this type cannot end up in the output.
 */
export interface UsageEvent {
  /** Stable id, unique per model call. Used to drop duplicates. */
  eventId: string;
  agentId: AgentId;
  sessionId: string;
  timestamp: Date;
  model: string;
  /** Fresh (non-cached) input tokens. */
  inputTokens: number;
  /** Output tokens, including reasoning tokens. */
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** One-way hash of the project path. Never the real name. */
  projectHash?: string;
}
