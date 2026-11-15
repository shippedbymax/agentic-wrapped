import pc from 'picocolors';
import {
  type Renderer,
  type WrappedReport,
  describePeriod,
  formatAgentName,
  formatCompactNumber,
  formatModelName,
  formatUsd,
} from '../../core';

const LABEL_WIDTH = 20;
const BAR_WIDTH = 24;

function renderBar(share: number): string {
  const filled = Math.round(share * BAR_WIDTH);
  return pc.magenta('█'.repeat(filled)) + pc.dim('░'.repeat(BAR_WIDTH - filled));
}

function renderTerminalReport(report: WrappedReport): string {
  const { stats, insights } = report;
  const period = describePeriod(stats);
  const lines: string[] = [
    '',
    pc.bold(pc.magenta(`  ${period.headline}, wrapped`)),
    pc.dim(`  ${period.range}`),
    '',
  ];

  for (const insight of insights) {
    lines.push(
      `  ${pc.dim(insight.title.padEnd(LABEL_WIDTH))}${pc.bold(insight.value)}  ${pc.dim(insight.detail)}`,
    );
  }

  lines.push('', pc.bold('  Agents'));
  for (const agent of stats.agents) {
    const share = stats.totals.totalTokens === 0 ? 0 : agent.totalTokens / stats.totals.totalTokens;
    lines.push(
      `  ${formatAgentName(agent.agentId).padEnd(LABEL_WIDTH)}${renderBar(share)}  ${formatCompactNumber(agent.totalTokens)} tokens  ${pc.dim(formatUsd(agent.costUsd))}`,
    );
  }

  lines.push('', pc.bold('  Top models'));
  for (const model of stats.models.slice(0, 5)) {
    const share = stats.totals.totalTokens === 0 ? 0 : model.totalTokens / stats.totals.totalTokens;
    lines.push(
      `  ${formatModelName(model.model)
        .slice(0, LABEL_WIDTH - 1)
        .padEnd(
          LABEL_WIDTH,
        )}${renderBar(share)}  ${formatCompactNumber(model.totalTokens)} tokens  ${pc.dim(formatUsd(model.costUsd))}`,
    );
  }

  if (stats.unpricedModels.length > 0) {
    lines.push(
      '',
      pc.yellow(`  No price known for: ${stats.unpricedModels.join(', ')} (not in the cost).`),
    );
  }
  lines.push('');
  return lines.join('\n');
}

export const terminalRenderer: Renderer<string> = {
  id: 'terminal',
  render: async (report) => renderTerminalReport(report),
};
