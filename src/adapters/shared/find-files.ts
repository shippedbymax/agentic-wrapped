import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** All files under `rootDir` with the given extension. A missing folder gives an empty list. */
export async function findFiles(rootDir: string, extension: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(rootDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const filePaths: string[] = [];
  for (const entry of entries) {
    const entryPath = join(rootDir, entry.name);
    if (entry.isDirectory()) filePaths.push(...(await findFiles(entryPath, extension)));
    else if (entry.isFile() && entry.name.endsWith(extension)) filePaths.push(entryPath);
  }
  return filePaths.sort();
}
