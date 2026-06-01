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

export interface GridConfig {
  numColumns: number;
  gap: number;
}

export function getGridConfig(viewportWidth: number): GridConfig {
  if (viewportWidth < BREAKPOINTS.tablet) {
    return { numColumns: 1, gap: 16 };
  }
  if (viewportWidth < BREAKPOINTS.desktop) {
    return { numColumns: 2, gap: 24 };
  }
  if (viewportWidth < BREAKPOINTS.largeDesktop) {
    return { numColumns: 3, gap: 24 };
  }
  return { numColumns: 4, gap: 32 };
}
