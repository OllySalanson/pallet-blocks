/** Where the game is: which screen is up, and that screen's own state. */
export type Screen =
  | { readonly kind: 'title'; readonly cursor: number }
  | { readonly kind: 'ready'; readonly elapsedMs: number }
  | { readonly kind: 'playing' }
  | { readonly kind: 'paused'; readonly cursor: number }
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

/** Moves a menu cursor, wrapping at both ends. */
export function moveCursor(cursor: number, by: number, count: number): number {
  return (((cursor + by) % count) + count) % count;
}

/** Steps the start level, clamped to what is offered. */
export function stepLevel(level: number, by: number): number {
  return Math.min(MAX_START_LEVEL, Math.max(1, level + by));
}
