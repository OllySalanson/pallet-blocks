import { describe, expect, it } from 'vitest';
import { CALLOUT_MS } from '../render/scene';
import {
  MAX_START_LEVEL,
  READY_MS,
  initialStartLevel,
  pauseOver,
  resumeFrom,
  stepEffectsClock,
  type Screen,
} from './screens';

function pausedOver(screen: Screen) {
  const paused = pauseOver(screen);
  if (paused.kind !== 'paused') {
    throw new Error('expected the pause menu');
  }
  return paused;
}

describe('pausing and resuming', () => {
  it('opens the pause menu with RESUME chosen', () => {
    expect(pauseOver({ kind: 'playing' })).toMatchObject({ kind: 'paused', cursor: 0 });
  });

  it('resumes a game in play straight into play', () => {
    expect(resumeFrom(pausedOver({ kind: 'playing' }))).toEqual({ kind: 'playing' });
  });

  it('returns to READY where it left off when the pause came before GO', () => {
    const paused = pausedOver({ kind: 'ready', elapsedMs: 200 });
    expect(resumeFrom(paused)).toEqual({ kind: 'ready', elapsedMs: 200 });
  });

  it('returns to GO when the pause came while GO was up', () => {
    const paused = pausedOver({ kind: 'ready', elapsedMs: READY_MS + 100 });
    expect(resumeFrom(paused)).toEqual({ kind: 'ready', elapsedMs: READY_MS + 100 });
  });
});

describe('effects over a pause', () => {
  /** Plays out `frames` frames of `frameMs` on `screen`, from `effectsMs`. */
  function run(effectsMs: number, screen: Screen, frames: number, frameMs = 1000 / 60): number {
    let ms = effectsMs;
    for (let i = 0; i < frames; i += 1) {
      ms = stepEffectsClock(ms, screen, frameMs);
    }
    return ms;
  }

  it('keeps a callout raised just before a pause up, with its time left, after resuming', () => {
    const raisedAt = run(0, { kind: 'playing' }, 30);
    const paused = pausedOver({ kind: 'playing' });
    // A long pause: far longer than any callout stays up.
    const atResume = run(run(raisedAt, { kind: 'playing' }, 6), paused, 600);
    const afterResume = run(atResume, resumeFrom(paused), 6);
    expect(afterResume - raisedAt).toBeCloseTo(200);
    expect(afterResume - raisedAt).toBeLessThan(CALLOUT_MS);
  });

  it('lets a callout run out in play and through the countdown and game over', () => {
    for (const screen of [
      { kind: 'playing' },
      { kind: 'ready', elapsedMs: 0 },
      { kind: 'toppingOut', elapsedMs: 0 },
    ] as const) {
      expect(run(0, screen, 120)).toBeGreaterThan(CALLOUT_MS);
    }
  });
});

describe('the start level on opening', () => {
  it('starts on 1 in a browser that has never picked one', () => {
    expect(initialStartLevel(undefined, null)).toBe(1);
  });

  it('comes back on the level this browser last picked', () => {
    expect(initialStartLevel(undefined, '5')).toBe(5);
  });

  it('lets the host choose over the saved level', () => {
    expect(initialStartLevel(3, '5')).toBe(3);
  });

  it('ignores a saved level that is not a number, and clamps one out of range', () => {
    expect(initialStartLevel(undefined, '')).toBe(1);
    expect(initialStartLevel(undefined, 'five')).toBe(1);
    expect(initialStartLevel(undefined, '0')).toBe(1);
    expect(initialStartLevel(undefined, '99')).toBe(MAX_START_LEVEL);
    expect(initialStartLevel(undefined, '7.6')).toBe(7);
  });
});
