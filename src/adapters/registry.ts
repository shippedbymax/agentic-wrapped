import type { AgentAdapter, AgentId } from '../core';
import { claudeCodeAdapter } from './claude-code';
import { codexAdapter } from './codex';

/** Every supported agent. Typed as a full record, so a new `AgentId` without an adapter fails to compile. */
const ADAPTERS_BY_ID: Readonly<Record<AgentId, AgentAdapter>> = {
  'claude-code': claudeCodeAdapter,
  codex: codexAdapter,
};

export const ALL_ADAPTERS: readonly AgentAdapter[] = Object.values(ADAPTERS_BY_ID);

export function getAdapter(agentId: AgentId): AgentAdapter {
  return ADAPTERS_BY_ID[agentId];
}
