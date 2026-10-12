import type { LockResult } from '../core/game';
import { BACK_TO_BACK_MULTIPLIER } from '../core/scoring';
import { formatScore } from '../render/scene';

const LINE_NAMES = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD'] as const;

/** At most this many lines fit the side panel above the points. */
export const PANEL_LINES = 4;

/**
 * The words the side panel shows for a lock worth talking about, one entry per
 * line of the panel, most important first. Empty when there is nothing to say.
 * Every entry fits the panel's width.
 */
export function describeLock(lock: LockResult): string[] {
  const lines: string[] = [];
  if (lock.spin !== 'none') {
    lines.push(lock.spin === 'mini' ? 'T-SPIN MINI' : 'T-SPIN');
  }
  if (lock.lines > 0) {
    lines.push(LINE_NAMES[Math.min(lock.lines, 4)]!);
  }
  if (lock.perfectClear) {
    lines.push('PERFECT', 'CLEAR');
  }
  if (lock.backToBack) {
    lines.push(`B2B x${BACK_TO_BACK_MULTIPLIER}`);
  }
  if (lock.combo > 0) {
    lines.push(`COMBO x${lock.combo}`);
  }
  return lines.slice(0, PANEL_LINES);
}

/** A big moment, told across the middle of the well. */
export interface Banner {
  readonly kind: 'clear' | 'level';
  /** Small lines above the big ones. */
  readonly headers: readonly string[];
  /** The big lines. */
  readonly lines: readonly string[];
  /** A small line below them. */
  readonly footer: string | null;
  readonly durationMs: number;
}

export const CLEAR_BANNER_MS = 1100;
export const LEVEL_BANNER_MS = 1500;

/** The banner for a lock, if it is one of the big ones: a quad, a T-spin that clears, a perfect clear. */
export function bannerForLock(lock: LockResult): Banner | null {
  const headers = lock.backToBack ? ['BACK-TO-BACK'] : [];
  let lines: string[];
  if (lock.perfectClear) {
    // PERFECT is too wide to letter large in the well.
    headers.push('PERFECT');
    lines = ['CLEAR!'];
  } else if (lock.spin === 'full' && lock.lines > 0) {
    lines = ['T-SPIN', LINE_NAMES[Math.min(lock.lines, 3)]!];
  } else if (lock.lines >= 4) {
    lines = ['QUAD!'];
  } else {
    return null;
  }
  return {
    kind: 'clear',
    headers,
    lines,
    footer: `+${formatScore(lock.points)}`,
    durationMs: CLEAR_BANNER_MS,
  };
}

/** The banner for reaching a new level. "LV", as the handheld creature games print it, fits large at any level. */
export function bannerForLevel(level: number): Banner {
  return {
    kind: 'level',
    headers: ['LEVEL UP!'],
    lines: [`LV ${level}`],
    footer: null,
    durationMs: LEVEL_BANNER_MS,
  };
}
