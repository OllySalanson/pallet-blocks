/**
 * The arithmetic behind turning an outline font into a one-bit pixel font,
 * kept apart from the canvas so it is testable without one.
 *
 * Orange Kid is a pixel *style* outline font rather than a bitmap: its stems
 * are about 78 units of a 1000-unit em and on no regular grid, so drawn with
 * `fillText` every letter arrives as a grey-edged smear. Each glyph is instead
 * rasterised alone, at whichever sub-pixel nudge leaves it least grey, and cut
 * to one-bit coverage. (Escape from Pallet Town does the same in its
 * `pixelText.ts`; this is a smaller cut of that idea.)
 */

/** A stem of the face, as a fraction of the em. */
const STEM_EM = 0.078;

/**
 * Coverage, of 255, a pixel needs to count as ink: a shade under half a stem,
 * so a stem inks exactly one column wherever it falls.
 */
export function inkThreshold(fontSizePx: number): number {
  const stemWidthPx = fontSizePx * STEM_EM;
  return Math.round(Math.min(0.5, stemWidthPx * 0.62) * 255);
}

/** How far a pixel's coverage is from being either ink or paper. */
export function greyness(coverage: number): number {
  return Math.min(coverage, 255 - coverage);
}

/** Total greyness of an alpha channel, read from RGBA data. */
export function totalGreyness(rgba: Uint8ClampedArray): number {
  let total = 0;
  for (let i = 3; i < rgba.length; i += 4) {
    total += greyness(rgba[i]!);
  }
  return total;
}

export interface InkBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Cuts RGBA data to a one-bit mask and finds the box around the ink, or null if blank. */
export function cutMask(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
): { mask: Uint8Array; box: InkBox | null } {
  const mask = new Uint8Array(width * height);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3]! >= threshold) {
        mask[y * width + x] = 1;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return { mask, box: right < 0 ? null : { left, top, right, bottom } };
}
