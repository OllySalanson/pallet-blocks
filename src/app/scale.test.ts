import { describe, expect, it } from 'vitest';
import { fitScale } from './scale';

describe('fitScale', () => {
  it('picks the largest whole scale that fits', () => {
    expect(fitScale(1280, 800, 256, 208)).toBe(3);
    expect(fitScale(1920, 1080, 256, 208)).toBe(5);
    expect(fitScale(256, 208, 256, 208)).toBe(1);
  });

  it('is limited by whichever side is tighter', () => {
    expect(fitScale(2000, 450, 256, 208)).toBe(2);
    expect(fitScale(600, 2000, 256, 208)).toBe(2);
  });

  it('fits by width alone when there is no height to go on', () => {
    expect(fitScale(1024, Infinity, 256, 208)).toBe(4);
  });

  it('shrinks by a fraction only when even 1x does not fit', () => {
    expect(fitScale(128, 400, 256, 208)).toBe(0.5);
  });

  it('never returns nothing', () => {
    expect(fitScale(0, 0, 256, 208)).toBe(1);
  });
});
