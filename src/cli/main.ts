import { homedir } from 'node:os';
import packageJson from '../../package.json';
import { runCli } from './run';

const exitCode = await runCli(process.argv.slice(2), {
  host: { homeDir: homedir(), env: process.env },
  now: new Date(),
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  version: packageJson.version,
  writeStdout: (text) => process.stdout.write(text),
  writeStderr: (text) => process.stderr.write(text),
});
process.exitCode = exitCode;
