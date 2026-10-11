/**
 * Pallet Blocks as a component another page can host.
 *
 *     import { mountPalletBlocks } from 'pallet-blocks';
 *
 *     const game = mountPalletBlocks(document.querySelector('#console')!, {
 *       playerName: 'OLLY',
 *       onGameOver: ({ score, lines, level }) => postScore(score, lines, level),
 *     });
 *     // later: game.destroy();
 *
 * See the README for every option.
 */
import { PalletBlocksApp, type PalletBlocksOptions } from './app/app';

export type { GameOverResult, LeaderboardEntry, PalletBlocksOptions } from './app/app';

/** What `mountPalletBlocks` hands back. */
export interface PalletBlocksHandle {
  /** Pauses a game in progress (no-op on other screens). */
  pause(): void;
  /** Resumes a paused game. */
  resume(): void;
  /** Starts a new game straight away, abandoning any game in progress. */
  restart(): void;
  /** Gives the game keyboard focus. */
  focus(): void;
  /** Stops the game, silences it, and removes everything it added to the element. */
  destroy(): void;
}

/**
 * Mounts the game into `element`, which it fills, scaling its 256x208 screen
 * up by whole pixels. Give the element a size; if it has no height, the game
 * sizes itself from the width.
 */
export function mountPalletBlocks(
  element: HTMLElement,
  options: PalletBlocksOptions = {},
): PalletBlocksHandle {
  const app = new PalletBlocksApp(element, options);
  return {
    pause: () => app.pause(),
    resume: () => app.resume(),
    restart: () => app.restart(),
    focus: () => app.focus(),
    destroy: () => app.destroy(),
  };
}

/** The game's native resolution, for hosts that want to size a frame for it. */
export const PALLET_BLOCKS_SIZE = { width: 256, height: 208 } as const;
