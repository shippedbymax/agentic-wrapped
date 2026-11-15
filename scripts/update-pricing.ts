/**
 * Dev-time only: refreshes the bundled price snapshot from LiteLLM's public price list.
 * The published CLI never touches the network; it reads the snapshot in src/core/pricing.
 *
 * Usage: npm run update-pricing [-- path/to/local/model_prices.json]
 */
import { readFile, writeFile } from 'node:fs/promises';

const SOURCE_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
const OUTPUT_PATH = new URL('../src/core/pricing/model-prices.json', import.meta.url);
const PROVIDERS = new Set(['anthropic', 'openai']);
const MODES = new Set(['chat', 'responses']);

interface LiteLlmEntry {
  litellm_provider?: string;
  mode?: string;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  cache_read_input_token_cost?: number;
  cache_creation_input_token_cost?: number;
}

const localPath = process.argv[2];
const rawText = localPath
  ? await readFile(localPath, 'utf8')
  : await (await fetch(SOURCE_URL)).text();
const source = JSON.parse(rawText) as Record<string, LiteLlmEntry>;

const prices: Record<string, object> = {};
for (const [modelName, entry] of Object.entries(source).sort(([a], [b]) => a.localeCompare(b))) {
  if (modelName.includes('/') || modelName.startsWith('ft:')) continue;
  if (!PROVIDERS.has(entry.litellm_provider ?? '') || !MODES.has(entry.mode ?? '')) continue;
  if (entry.input_cost_per_token == null || entry.output_cost_per_token == null) continue;
  prices[modelName] = {
    inputUsdPerToken: entry.input_cost_per_token,
    outputUsdPerToken: entry.output_cost_per_token,
    cacheReadUsdPerToken: entry.cache_read_input_token_cost ?? entry.input_cost_per_token,
    cacheWriteUsdPerToken: entry.cache_creation_input_token_cost ?? entry.input_cost_per_token,
  };
}

const snapshot = { source: SOURCE_URL, updatedAt: new Date().toISOString().slice(0, 10), prices };
await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${Object.keys(prices).length} model prices.`);
