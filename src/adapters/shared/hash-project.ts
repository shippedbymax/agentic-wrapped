import { createHash } from 'node:crypto';

/** One-way hash of a project path, so project names never leave the adapter. */
export function hashProject(projectPath: string): string {
  return createHash('sha256').update(projectPath).digest('hex').slice(0, 12);
}
