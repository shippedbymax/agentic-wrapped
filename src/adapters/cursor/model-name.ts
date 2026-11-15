/** Cursor's own label when it picks the model itself. No price can be known for it. */
export const CURSOR_AUTO_MODEL = 'cursor-auto';

const EFFORT_SUFFIX = /-(low|medium|high|xhigh|max|fast|thinking)$/;
const CLAUDE_NAME = /^claude-(\d+(?:\.\d+)?)-(opus|sonnet|haiku)$/;

/**
 * Cursor names models its own way: `claude-4.6-opus-high-thinking`, `gpt-5.4-medium`.
 * This turns them into the providers' names (`claude-opus-4-6`, `gpt-5.4`), so the
 * price table and the other agents' data line up.
 */
export function toProviderModelName(cursorModelName: string | null): string {
  if (!cursorModelName || cursorModelName === 'default' || cursorModelName === 'auto') {
    return CURSOR_AUTO_MODEL;
  }
  let name = cursorModelName.toLowerCase();
  while (EFFORT_SUFFIX.test(name)) name = name.replace(EFFORT_SUFFIX, '');
  const claude = CLAUDE_NAME.exec(name);
  return claude ? `claude-${claude[2]}-${claude[1]?.replace('.', '-')}` : name;
}
