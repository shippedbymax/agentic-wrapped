import { createRequire } from 'node:module';

/** The small part of Node's built-in SQLite module that the adapter uses. */
export interface ReadOnlyDatabase {
  prepare(sql: string): { all(): unknown[] };
  close(): void;
}

interface SqliteModule {
  DatabaseSync: new (path: string, options: { readOnly: boolean }) => ReadOnlyDatabase;
}

export const NODE_TOO_OLD_MESSAGE =
  'Cursor data needs Node.js 22.5 or newer. Update Node to include Cursor in your wrapped.';

const require = createRequire(import.meta.url);

/**
 * Opens a SQLite file read-only with Node's built-in `node:sqlite`.
 * Built-in means no native dependency to download, but it only exists in newer Node versions.
 */
export function openReadOnlyDatabase(path: string): ReadOnlyDatabase {
  // Node still prints an "experimental" warning for this module; it is noise for users.
  const emitWarning = process.emitWarning;
  process.emitWarning = () => {};
  let sqlite: SqliteModule;
  try {
    sqlite = require('node:sqlite') as SqliteModule;
  } catch {
    throw new Error(NODE_TOO_OLD_MESSAGE);
  } finally {
    process.emitWarning = emitWarning;
  }
  return new sqlite.DatabaseSync(path, { readOnly: true });
}
