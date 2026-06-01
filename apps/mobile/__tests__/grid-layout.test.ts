import { getGridConfig } from '@/constants/breakpoints';

describe('getGridConfig', () => {
  // Mobile tier — below BREAKPOINTS.tablet (600)
  it('returns 1 col / 16px gap at 599 (mobile, just below tablet)', () => {
    expect(getGridConfig(599)).toEqual({ numColumns: 1, gap: 16 });
  });

  // Tablet threshold exact
  it('returns 2 col / 24px gap at 600 (tablet threshold exact)', () => {
    expect(getGridConfig(600)).toEqual({ numColumns: 2, gap: 24 });
  });

  // Mid-tablet
  it('returns 2 col / 24px gap at 768 (mid-tablet)', () => {
    expect(getGridConfig(768)).toEqual({ numColumns: 2, gap: 24 });
  });

  // Just below desktop
  it('returns 2 col / 24px gap at 1023 (just below desktop)', () => {
    expect(getGridConfig(1023)).toEqual({ numColumns: 2, gap: 24 });
  });

  // Desktop threshold exact
  it('returns 3 col / 24px gap at 1024 (desktop threshold exact)', () => {
    expect(getGridConfig(1024)).toEqual({ numColumns: 3, gap: 24 });
  });

  // Just below largeDesktop
  it('returns 3 col / 24px gap at 1439 (just below largeDesktop)', () => {
    expect(getGridConfig(1439)).toEqual({ numColumns: 3, gap: 24 });
  });

  // largeDesktop threshold exact
  it('returns 4 col / 32px gap at 1440 (largeDesktop threshold exact)', () => {
    expect(getGridConfig(1440)).toEqual({ numColumns: 4, gap: 32 });
  });

  // Wide
  it('returns 4 col / 32px gap at 2560 (very wide)', () => {
    expect(getGridConfig(2560)).toEqual({ numColumns: 4, gap: 32 });
  });
});
