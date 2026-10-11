/**
 * Points, levels and speed. Everything here is a pure function of numbers, so
 * the rules can be read and tested in one place.
 */

export type SpinKind = 'none' | 'mini' | 'full';

/** Lines needed to go up a level. */
export const LINES_PER_LEVEL = 10;

/** The level whose gravity is the fastest the game gets. */
export const MAX_GRAVITY_LEVEL = 20;

/** Base points for a clear, before the level multiplier, indexed by lines cleared. */
const LINE_POINTS = [0, 100, 300, 500, 800] as const;
const MINI_SPIN_POINTS = [100, 200, 400] as const;
const FULL_SPIN_POINTS = [400, 800, 1200, 1600] as const;
const PERFECT_CLEAR_POINTS = [0, 800, 1200, 1800, 2000] as const;
/** A back-to-back four-line perfect clear is worth more than the plain one. */
const BACK_TO_BACK_QUAD_PERFECT_CLEAR = 3200;

export const SOFT_DROP_POINTS_PER_CELL = 1;
export const HARD_DROP_POINTS_PER_CELL = 2;
export const COMBO_POINTS = 50;

/** The level a game is on after clearing `lines`, having started on `startLevel`. */
export function levelFor(startLevel: number, lines: number): number {
  return startLevel + Math.floor(lines / LINES_PER_LEVEL);
}

/**
 * How long a piece takes to fall one row, in milliseconds. This is the familiar
 * modern curve: one row a second at level 1, speeding up until it is effectively
 * instant by level 20.
 */
export function gravityMsPerRow(level: number): number {
  const l = Math.min(Math.max(level, 1), MAX_GRAVITY_LEVEL);
  return Math.pow(0.8 - (l - 1) * 0.007, l - 1) * 1000;
}

/**
 * A "difficult" clear keeps a back-to-back chain going: four lines at once, or
 * any spin that clears lines.
 */
export function isDifficultClear(lines: number, spin: SpinKind): boolean {
  return lines === 4 || (spin !== 'none' && lines > 0);
}

/** Points for the clear itself, at level 1, before back-to-back. */
export function clearPoints(lines: number, spin: SpinKind): number {
  if (spin === 'full') {
    return FULL_SPIN_POINTS[Math.min(lines, 3)]!;
  }
  if (spin === 'mini') {
    return MINI_SPIN_POINTS[Math.min(lines, 2)]!;
  }
  return LINE_POINTS[Math.min(lines, 4)]!;
}

export interface LockScoreInput {
  readonly lines: number;
  readonly spin: SpinKind;
  readonly level: number;
  /** Combo count after this lock: 0 for the first clear in a row, 1 for the second, ... */
  readonly combo: number;
  /** Whether this clear continues a back-to-back chain. */
  readonly backToBack: boolean;
  readonly perfectClear: boolean;
}

/** Every point a single lock earns: the clear, back-to-back, combo and perfect clear. */
export function lockPoints(input: LockScoreInput): number {
  const { lines, spin, level, combo, backToBack, perfectClear } = input;
  let points = clearPoints(lines, spin);
  if (backToBack) {
    points *= 1.5;
  }
  if (lines > 0 && combo > 0) {
    points += COMBO_POINTS * combo;
  }
  if (perfectClear && lines > 0) {
    points += backToBack && lines === 4 ? BACK_TO_BACK_QUAD_PERFECT_CLEAR : PERFECT_CLEAR_POINTS[lines]!;
  }
  return Math.floor(points * level);
}
