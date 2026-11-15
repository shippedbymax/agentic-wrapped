import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export interface NumberedLine {
  text: string;
  lineNumber: number;
}

/** Streams a file line by line. Never loads the whole file: logs can be gigabytes. */
export async function* readLines(filePath: string): AsyncGenerator<NumberedLine> {
  const lines = createInterface({
    input: createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  let lineNumber = 0;
  for await (const text of lines) {
    lineNumber += 1;
    if (text.length > 0) yield { text, lineNumber };
  }
}
