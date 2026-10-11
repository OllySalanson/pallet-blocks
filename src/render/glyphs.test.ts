import { describe, expect, it } from 'vitest';
import { cutMask, greyness, inkThreshold, totalGreyness } from './glyphs';

describe('glyph cutting', () => {
  it('needs about half coverage to ink a pixel at the body size', () => {
    expect(inkThreshold(12.5)).toBe(128);
    expect(inkThreshold(6)).toBeLessThan(128);
  });

  it('scores grey pixels worse than solid or empty ones', () => {
    expect(greyness(0)).toBe(0);
    expect(greyness(255)).toBe(0);
    expect(greyness(128)).toBe(127);
    const crisp = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]);
    const smeared = new Uint8ClampedArray([0, 0, 0, 128, 0, 0, 0, 128]);
    expect(totalGreyness(crisp)).toBeLessThan(totalGreyness(smeared));
  });

  it('cuts a mask and boxes its ink', () => {
    const rgba = new Uint8ClampedArray(3 * 2 * 4);
    rgba[(0 * 3 + 1) * 4 + 3] = 200;
    rgba[(1 * 3 + 2) * 4 + 3] = 140;
    rgba[(1 * 3 + 0) * 4 + 3] = 100;
    const { mask, box } = cutMask(rgba, 3, 2, 128);
    expect([...mask]).toEqual([0, 1, 0, 0, 0, 1]);
    expect(box).toEqual({ left: 1, top: 0, right: 2, bottom: 1 });
    expect(cutMask(new Uint8ClampedArray(4), 1, 1, 128).box).toBeNull();
  });
});
