/** Where the game is: which screen is up, and that screen's own state. */
export type Screen =
  | { readonly kind: 'title'; readonly cursor: number }
  | { readonly kind: 'ready'; readonly elapsedMs: number }
  | { readonly kind: 'playing' }
  | {
      readonly kind: 'paused';
      readonly cursor: number;
      /** How far into READY and GO! the pause came, or null if play had begun. */
      readonly readyElapsedMs: number | null;
    }
  | { readonly kind: 'toppingOut'; readonly elapsedMs: number }
  | { readonly kind: 'nameEntry'; readonly name: string }
  | { readonly kind: 'results'; readonly cursor: number; readonly rank: number };

/** How long READY and then GO! are up before a game starts. */
export const READY_MS = 700;
export const GO_MS = 500;
/** The grey curtain rises one row this often, then holds before the results. */
export const CURTAIN_ROW_MS = 40;
export const CURTAIN_HOLD_MS = 600;

export type TitleItem = 'play' | 'level' | 'sound' | 'exit';
export const PAUSE_ITEMS = ['RESUME', 'RESTART', 'QUIT'] as const;
export const RESULT_ITEMS = ['PLAY AGAIN', 'TITLE'] as const;

export const MAX_START_LEVEL = 15;

/** The pause menu over a live screen, remembering a countdown it interrupted. */
export function pauseOver(screen: Screen): Screen {
  return { kind: 'paused', cursor: 0, readyElapsedMs: screen.kind === 'ready' ? screen.elapsedMs : null };
}

/**
 * Where RESUME goes: back into the countdown where the pause cut it short, or,
 * from play, through READY and GO! again. The pause hid the board, so the
 * player gets a moment to read the stack before the piece moves.
 */
export function resumeFrom(paused: Extract<Screen, { kind: 'paused' }>): Screen {
  return { kind: 'ready', elapsedMs: paused.readyElapsedMs ?? 0 };
}

/**
 * The clock that callouts, banners and drop effects keep time by: it stands
 * still while the game is paused, so a callout raised just before a pause is
 * still up, with its time left, when play resumes.
 */
export function stepEffectsClock(effectsMs: number, screen: Screen, dtMs: number): number {
  return screen.kind === 'paused' ? effectsMs : effectsMs + dtMs;
}

/** Moves a menu cursor, wrapping at both ends. */
export function moveCursor(cursor: number, by: number, count: number): number {
  return (((cursor + by) % count) + count) % count;
}

/** Steps the start level, clamped to what is offered. */
export function stepLevel(level: number, by: number): number {
  return Math.min(MAX_START_LEVEL, Math.max(1, level + by));
}

/**
 * The level the LEVEL option shows when the game opens: the host's choice if it
 * made one, else the one this browser last picked, else 1. A saved value that
 * is not a whole level in range is ignored or clamped.
 */
export function initialStartLevel(option: number | undefined, saved: string | null): number {
  const savedLevel = saved === null || saved.trim() === '' ? NaN : Number(saved);
  const level = option ?? (Number.isFinite(savedLevel) ? savedLevel : 1);
  return stepLevel(Math.floor(level), 0);
}
