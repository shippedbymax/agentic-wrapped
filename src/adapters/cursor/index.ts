import type { AgentAdapter } from '../../core';
import { discoverCursorLogs } from './discover';
import { parseCursorLog } from './parse';

export const cursorAdapter: AgentAdapter = {
  id: 'cursor',
  discover: discoverCursorLogs,
  parse: parseCursorLog,
};
