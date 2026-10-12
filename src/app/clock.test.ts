import { describe, expect, it } from 'vitest';
import { Game } from '../core/game';
import { gravityMsPerRow } from '../core/scoring';
import { advance, frameDelta, MAX_FRAME_MS } from './clock';

/**
 * Plays `game` for about `totalMs` of wall-clock time at `fps` frames a second,
 * the way the app's loop does, and says how long it played in whole frames.
 */
function playAtFrameRate(game: Game, fps: number, totalMs: number): number {
  const frameMs = 1000 / fps;
  let last: number | null = null;
  let now = 0;
  for (; now <= totalMs + 1e-6; now += frameMs) {
    advance(game, frameDelta(last, now));
    last = now;
  }
  return last ?? 0;
}

describe('game clock', () => {
  it('counts every millisecond of a slow frame, so a busy host does not slow the game', () => {
    // Ten frames a second: a heavy host page, or a machine with other work on.
    let last: number | null = null;
    let total = 0;
    for (let now = 0; now <= 1000; now += 100) {
      total += frameDelta(last, now);
      last = now;
    }
    expect(total).toBe(1000);
  });

  it('treats a long stall as one capped frame rather than a leap', () => {
    expect(frameDelta(0, 5000)).toBe(MAX_FRAME_MS);
    expect(frameDelta(null, 5000)).toBe(0);
    expect(frameDelta(100, 90)).toBe(0);
  });

  it.each([60, 30, 10, 5])('falls at the level speed at %i frames a second', (fps) => {
    for (const level of [1, 2, 4, 8]) {
      const game = new Game({ startLevel: level, sequence: ['O'] });
      const startY = game.piece!.y;
      const ms = gravityMsPerRow(level);
      // Long enough to fall a few rows, short of the floor.
      const played = playAtFrameRate(game, fps, Math.min(3500, ms * 6.5));
      // Every whole row the time played is worth, and no more.
      const fell = game.piece!.y - startY;
      expect(fell, `level ${level}`).toBeGreaterThan(played / ms - 1 - 1e-6);
      expect(fell, `level ${level}`).toBeLessThanOrEqual(played / ms + 1e-6);
    }
  });

  it('plays a slow frame out the same as several quick ones', () => {
    const slow = new Game({ sequence: ['T', 'O', 'I'] });
    const quick = new Game({ sequence: ['T', 'O', 'I'] });
    slow.press('left');
    quick.press('left');
    // A held direction auto-repeats, and the piece falls and locks, in both.
    playAtFrameRate(slow, 4, 20000);
    playAtFrameRate(quick, 60, 20000);
    expect(slow.board.toRows()).toEqual(quick.board.toRows());
    expect(slow.piece).toEqual(quick.piece);
  });
});
