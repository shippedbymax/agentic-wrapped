import type { Renderer } from '../../core';

/** Machine-readable output. Shows exactly the data every other renderer gets. */
export const jsonRenderer: Renderer<string> = {
  id: 'json',
  render: async (report) => `${JSON.stringify(report, null, 2)}\n`,
};
