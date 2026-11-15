import { homedir } from 'node:os';
import packageJson from '../../package.json';
import { runCli } from './run';

try {
  process.exitCode = await runCli(process.argv.slice(2), {
    host: { homeDir: homedir(), env: process.env },
    now: new Date(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    version: packageJson.version,
    writeStdout: (text) => process.stdout.write(text),
    writeStderr: (text) => process.stderr.write(text),
  });
} catch (error) {
  // Anything unexpected (for example a read-only output folder): one clear line, no stack trace.
  const reason = error instanceof Error ? error.message : String(error);
  process.stderr.write(`agentic-wrapped failed: ${reason}\n`);
  process.exitCode = 1;
}
