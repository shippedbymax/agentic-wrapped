import type { AgentAdapter } from '../../core';
import { discoverCodexLogs } from './discover';
import { parseCodexLog } from './parse';

export const codexAdapter: AgentAdapter = {
  id: 'codex',
  displayName: 'Codex',
  discover: discoverCodexLogs,
  parse: parseCodexLog,
};
