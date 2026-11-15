import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import type { Renderer } from '../../core';
import { INTER_FONT_WEIGHTS, readInterFont } from '../shared/inter-font';
import { CARD_HEIGHT, CARD_WIDTH, buildCard } from './build-card';

async function loadFonts() {
  return Promise.all(
    INTER_FONT_WEIGHTS.map(async (weight) => ({
      name: 'Inter',
      weight,
      style: 'normal' as const,
      data: await readInterFont(weight),
    })),
  );
}

/** Renders the share card as a PNG. No browser needed. */
export const imageRenderer: Renderer<Uint8Array> = {
  id: 'image',
  render: async (report) => {
    // satori types expect a React node; it only reads `type` and `props`.
    const card = buildCard(report) as unknown as Parameters<typeof satori>[0];
    const svg = await satori(card, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fonts: await loadFonts(),
    });
    return new Resvg(svg).render().asPng();
  },
};
