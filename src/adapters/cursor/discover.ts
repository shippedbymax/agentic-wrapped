import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { HostEnvironment, LogSource } from '../../core';

/** Cursor keeps every chat of every project in one SQLite file. */
const DATABASE_PATH = ['Cursor', 'User', 'globalStorage', 'state.vscdb'];

function getConfigDir(host: HostEnvironment): string {
  if (host.platform === 'win32') {
    return host.env.APPDATA || join(host.homeDir, 'AppData', 'Roaming');
  }
  if (host.platform === 'darwin') {
    return join(host.homeDir, 'Library', 'Application Support');
  }
  return host.env.XDG_CONFIG_HOME || join(host.homeDir, '.config');
}

export async function discoverCursorLogs(host: HostEnvironment): Promise<LogSource[]> {
  const path = join(getConfigDir(host), ...DATABASE_PATH);
  try {
    const file = await stat(path);
    return file.isFile() ? [{ agentId: 'cursor', path }] : [];
  } catch {
    return [];
  }
}
