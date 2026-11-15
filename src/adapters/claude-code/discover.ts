import { join } from 'node:path';
import type { HostEnvironment, LogSource } from '../../core';
import { findFiles } from '../shared/find-files';

/** Claude Code has used both locations. `CLAUDE_CONFIG_DIR` (comma-separated) overrides them. */
function listConfigDirs(host: HostEnvironment): string[] {
  const override = host.env.CLAUDE_CONFIG_DIR;
  if (override) {
    return override
      .split(',')
      .map((dir) => dir.trim())
      .filter((dir) => dir.length > 0);
  }
  const xdgConfigHome = host.env.XDG_CONFIG_HOME ?? join(host.homeDir, '.config');
  return [join(host.homeDir, '.claude'), join(xdgConfigHome, 'claude')];
}

export async function discoverClaudeCodeLogs(host: HostEnvironment): Promise<LogSource[]> {
  const sources: LogSource[] = [];
  for (const configDir of listConfigDirs(host)) {
    const logPaths = await findFiles(join(configDir, 'projects'), '.jsonl');
    for (const path of logPaths) sources.push({ agentId: 'claude-code', path });
  }
  return sources;
}
