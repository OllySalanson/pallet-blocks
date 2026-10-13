import { describe, expect, it } from 'vitest';
import { READY_MS, pauseOver, resumeFrom, type Screen } from './screens';

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
