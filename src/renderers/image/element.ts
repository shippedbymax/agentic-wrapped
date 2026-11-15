/** Minimal element tree that satori understands. Keeps the layout free of JSX and React. */
export type CardStyle = Record<string, string | number>;
export type CardChild = CardElement | string;

export interface CardElement {
  type: 'div';
  props: { style: CardStyle; children: CardChild[] };
}

/** A flex box. satori requires `display: flex` on every box with more than one child. */
export function box(style: CardStyle, ...children: CardChild[]): CardElement {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children } };
}
