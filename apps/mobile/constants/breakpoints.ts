/**
 * Responsive breakpoints for layout decisions.
 * Import BREAKPOINTS from this file instead of using literal pixel values in components.
 */
export const BREAKPOINTS = {
  tablet: 600,
  desktop: 1024,
  largeDesktop: 1440,
} as const;

export function computeRailWidth(viewportWidth: number): number {
  return Math.max(80, Math.min(Math.floor(viewportWidth * 0.1), 144));
}
