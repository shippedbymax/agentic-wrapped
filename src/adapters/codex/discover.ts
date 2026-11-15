import { join } from 'node:path';
import type { HostEnvironment, LogSource } from '../../core';
import { findFiles } from '../shared/find-files';

const SESSION_DIRS = ['sessions', 'archived_sessions'];

export async function discoverCodexLogs(host: HostEnvironment): Promise<LogSource[]> {
  const codexHome = host.env.CODEX_HOME ?? join(host.homeDir, '.codex');
  const sources: LogSource[] = [];
  for (const sessionDir of SESSION_DIRS) {
    const logPaths = await findFiles(join(codexHome, sessionDir), '.jsonl');
    for (const path of logPaths) sources.push({ agentId: 'codex', path });
  }
  return sources;
}
