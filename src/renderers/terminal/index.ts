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
    ...(report.isDemo ? [pc.yellow('  DEMO DATA: made-up numbers, not yours.')] : []),
    '',
  ];

  for (const insight of insights) {
    lines.push(
      `  ${pc.dim(insight.title.padEnd(LABEL_WIDTH))}${pc.bold(insight.value)}  ${pc.dim(insight.detail)}`,
    );
  }

  // Bars compare tokens when the logs have them, replies otherwise (Cursor logs no tokens).
  const hasTokens = stats.totals.totalTokens > 0;
  const total = hasTokens ? stats.totals.totalTokens : stats.totals.eventCount;
  const renderRow = (
    label: string,
    usage: { totalTokens: number; eventCount: number; costUsd: number },
  ) => {
    const amount = hasTokens ? usage.totalTokens : usage.eventCount;
    const details = [`${formatCompactNumber(amount)} ${hasTokens ? 'tokens' : 'replies'}`];
    if (usage.costUsd > 0) details.push(pc.dim(formatUsd(usage.costUsd)));
    return `  ${label.slice(0, LABEL_WIDTH - 1).padEnd(LABEL_WIDTH)}${renderBar(total === 0 ? 0 : amount / total)}  ${details.join('  ')}`;
  };

  lines.push('', pc.bold('  Agents'));
  for (const agent of stats.agents) lines.push(renderRow(formatAgentName(agent.agentId), agent));

  lines.push('', pc.bold('  Top models'));
  for (const model of stats.models.slice(0, 5)) {
    lines.push(renderRow(formatModelName(model.model), model));
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
