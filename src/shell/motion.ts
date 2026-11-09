/** Motion tokens for JavaScript. Keep in step with tokens.css. */
export const DUR = { instant: 0.12, short: 0.24, medium: 0.48, cloud: 0.9 } as const;

export const prefersReducedMotion = (): boolean =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;
