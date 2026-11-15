/** One card of the wrapped: a headline number plus a short line of context. */
export interface Insight {
  id: string;
  /** Small label above the value, e.g. `Total tokens`. */
  title: string;
  /** The big thing, e.g. `1.2B`. */
  value: string;
  /** One short sentence of context. */
  detail: string;
}
