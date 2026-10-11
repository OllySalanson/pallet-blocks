import fontUrl from '../assets/orange-kid.woff2';
import { cutMask, inkThreshold, totalGreyness } from './glyphs';

/** Our own family name, so we never collide with a host page's declaration of the same face. */
const FAMILY = 'Pallet Blocks Orange Kid';
/** Orange Kid's own grid: the size at which its pixels are one pixel. */
const BODY_SIZE = 12.5;
const PAD = 6;
const CELL = 32;
/** Where the baseline sits in the scratch canvas. */
const BASELINE = 22;
const SPACE_ADVANCE = 4;
const NUDGES = [0, 0.25, 0.5, 0.75];

interface Glyph {
  /** One-bit mask, `width` x `height`. */
  readonly mask: Uint8Array;
  readonly width: number;
  readonly height: number;
  /** Rows from the baseline up to the top of the mask (negative is above). */
  readonly top: number;
  readonly advance: number;
}

export type TextAlign = 'left' | 'center' | 'right';

export interface TextStyle {
  /** One colour, or one per row band of the cap height, top to bottom. */
  readonly color: string | readonly string[];
  readonly align?: TextAlign;
  /** Whole-pixel magnification of the one-bit glyphs. */
  readonly scale?: number;
  /** A colour stamped one pixel down and right first, as the handheld games do. */
  readonly shadow?: string;
  /** A colour stamped one pixel all round first. */
  readonly outline?: string;
  /** A colour stamped `depth` pixels below the outline, for lettering that stands up. */
  readonly depth?: { readonly color: string; readonly px: number };
}

let loading: Promise<boolean> | null = null;

/**
 * Loads the face from the bundle. Never rejects: if the font cannot load, the
 * game still runs and draws in the browser's monospace.
 */
export function loadGameFont(): Promise<boolean> {
  loading ??= (async () => {
    try {
      const face = new FontFace(FAMILY, `url(${fontUrl})`);
      document.fonts.add(face);
      await face.load();
      return true;
    } catch {
      return false;
    }
  })();
  return loading;
}

/**
 * Orange Kid as a bitmap font: every glyph rasterised once, cut to one bit and
 * cached, then stamped ink-tight with a one-pixel gap. A letter is therefore
 * the same shape in every colour and everywhere it appears.
 */
export class PixelFont {
  /** Cap height in pixels at scale 1: what a line of capitals stands on. */
  readonly capHeight: number;
  /** Line height at scale 1, including room for descenders. */
  readonly lineHeight: number;

  private readonly glyphs = new Map<string, Glyph>();
  private readonly tinted = new Map<string, HTMLCanvasElement>();
  private readonly scratch: CanvasRenderingContext2D;

  constructor() {
    const canvas = document.createElement('canvas');
    canvas.width = CELL + PAD * 2;
    canvas.height = CELL;
    this.scratch = canvas.getContext('2d', { willReadFrequently: true })!;
    const h = this.glyph('H');
    this.capHeight = h.height || 8;
    this.lineHeight = this.capHeight + 4;
  }

  /** Width of a line of text at the given scale. */
  measure(text: string, scale = 1): number {
    let width = 0;
    for (const ch of text) {
      width += this.glyph(ch).advance;
    }
    // No gap after the last letter.
    return Math.max(0, width - 1) * scale;
  }

  /**
   * Draws text with the top of its capitals at `y`. Everything is in whole
   * pixels; fractional positions are floored.
   */
  draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, style: TextStyle): void {
    const scale = style.scale ?? 1;
    const width = this.measure(text, scale);
    const align = style.align ?? 'left';
    const left = Math.floor(align === 'center' ? x - width / 2 : align === 'right' ? x - width : x);
    const top = Math.floor(y);
    const stamp = (dx: number, dy: number, color: string | readonly string[]) =>
      this.stamp(ctx, text, left + dx, top + dy, color, scale);

    if (style.depth) {
      for (let d = 1; d <= style.depth.px; d += 1) {
        for (const [ox, oy] of OUTLINE_OFFSETS) {
          stamp(ox * scale, (oy + d) * scale, style.depth.color);
        }
      }
    }
    if (style.outline) {
      for (const [ox, oy] of OUTLINE_OFFSETS) {
        stamp(ox * scale, oy * scale, style.outline);
      }
    }
    if (style.shadow) {
      stamp(scale, scale, style.shadow);
    }
    stamp(0, 0, style.color);
  }

  private stamp(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string | readonly string[],
    scale: number,
  ): void {
    let pen = x;
    for (const ch of text) {
      const glyph = this.glyph(ch);
      if (glyph.width > 0) {
        const image = this.tint(ch, glyph, color);
        ctx.drawImage(
          image,
          pen,
          y + (this.capHeight + glyph.top) * scale,
          glyph.width * scale,
          glyph.height * scale,
        );
      }
      pen += glyph.advance * scale;
    }
  }

  private tint(ch: string, glyph: Glyph, color: string | readonly string[]): HTMLCanvasElement {
    const key = `${ch}\u0000${typeof color === 'string' ? color : color.join(',')}`;
    let canvas = this.tinted.get(key);
    if (canvas) {
      return canvas;
    }
    canvas = document.createElement('canvas');
    canvas.width = glyph.width;
    canvas.height = glyph.height;
    const ctx = canvas.getContext('2d')!;
    const bands = typeof color === 'string' ? [color] : color;
    for (let row = 0; row < glyph.height; row += 1) {
      // Bands are measured down the cap height, so every letter shades alike.
      const capRow = row + this.capHeight + glyph.top;
      const band = Math.min(
        bands.length - 1,
        Math.max(0, Math.floor((capRow / this.capHeight) * bands.length)),
      );
      ctx.fillStyle = bands[band]!;
      for (let col = 0; col < glyph.width; col += 1) {
        if (glyph.mask[row * glyph.width + col]) {
          ctx.fillRect(col, row, 1, 1);
        }
      }
    }
    this.tinted.set(key, canvas);
    return canvas;
  }

  private glyph(ch: string): Glyph {
    let glyph = this.glyphs.get(ch);
    if (!glyph) {
      glyph = this.rasterise(ch);
      this.glyphs.set(ch, glyph);
    }
    return glyph;
  }

  private rasterise(ch: string): Glyph {
    if (ch === ' ') {
      return { mask: new Uint8Array(0), width: 0, height: 0, top: 0, advance: SPACE_ADVANCE };
    }
    const ctx = this.scratch;
    const { width, height } = ctx.canvas;
    ctx.font = `${BODY_SIZE}px "${FAMILY}", monospace`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000';

    // Try each quarter-pixel nudge and keep the one that leaves the least grey.
    let best: Uint8ClampedArray | null = null;
    let bestGrey = Infinity;
    for (const nudge of NUDGES) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillText(ch, PAD + nudge, BASELINE);
      const data = ctx.getImageData(0, 0, width, height).data;
      const grey = totalGreyness(data);
      if (grey < bestGrey) {
        bestGrey = grey;
        best = data;
      }
    }

    const { mask, box } = cutMask(best!, width, height, inkThreshold(BODY_SIZE));
    if (!box) {
      return { mask: new Uint8Array(0), width: 0, height: 0, top: 0, advance: SPACE_ADVANCE };
    }
    const w = box.right - box.left + 1;
    const h = box.bottom - box.top + 1;
    const tight = new Uint8Array(w * h);
    for (let row = 0; row < h; row += 1) {
      for (let col = 0; col < w; col += 1) {
        tight[row * w + col] = mask[(box.top + row) * width + box.left + col]!;
      }
    }
    return { mask: tight, width: w, height: h, top: box.top - BASELINE, advance: w + 1 };
  }
}

const OUTLINE_OFFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;
