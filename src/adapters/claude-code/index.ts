import type { AgentAdapter } from '../../core';
import { discoverClaudeCodeLogs } from './discover';
import { parseClaudeCodeLog } from './parse';

export const claudeCodeAdapter: AgentAdapter = {
  id: 'claude-code',
  discover: discoverClaudeCodeLogs,
  parse: parseClaudeCodeLog,
};
