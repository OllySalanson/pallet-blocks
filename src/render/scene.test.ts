import { describe, expect, it } from 'vitest';
import { BUFFER_ROWS, VISIBLE_ROWS } from '../core/board';
import { FOCUS_HINT, formatScore, formatTime, helpFor, rowOffset, topRowShown } from './scene';

describe('formatting', () => {
  it('groups score digits in threes', () => {
    expect(formatScore(0)).toBe('0');
    expect(formatScore(999)).toBe('999');
    expect(formatScore(1000)).toBe('1,000');
    expect(formatScore(1234567)).toBe('1,234,567');
  });

  it('prints minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(61_500)).toBe('1:01');
    expect(formatTime(3_600_000)).toBe('60:00');
  });
});

describe('rows on screen', () => {
  it('draws the field rows top to bottom, a cell apart', () => {
    expect(rowOffset(BUFFER_ROWS)).toBe(0);
    expect(rowOffset(BUFFER_ROWS + VISIBLE_ROWS - 1)).toBe((VISIBLE_ROWS - 1) * 8);
  });

  it('shows the buffer row just above the field, where a high stack pushes a new piece', () => {
    expect(rowOffset(BUFFER_ROWS - 1)).toBe(-8);
  });

  it('keeps the rest of the buffer out of sight', () => {
    expect(rowOffset(BUFFER_ROWS - 2)).toBeNull();
    expect(rowOffset(0)).toBeNull();
  });

  it('leaves the row above the field out under the results window, so nothing pokes out above it', () => {
    expect(topRowShown({ kind: 'results', cursor: 0, rank: -1 })).toBe(BUFFER_ROWS);
    expect(topRowShown({ kind: 'playing' })).toBe(BUFFER_ROWS - 1);
    expect(topRowShown({ kind: 'toppingOut', elapsedMs: 0 })).toBe(BUFFER_ROWS - 1);
    expect(topRowShown({ kind: 'nameEntry', name: '' })).toBe(BUFFER_ROWS - 1);
  });
});

describe('help bar', () => {
  it('names the keys for the screen while the game has focus', () => {
    expect(helpFor({ kind: 'playing' }, 0, true)).toContain('HOLD');
    expect(helpFor({ kind: 'paused', cursor: 0, readyElapsedMs: null }, 0, true)).toContain('RESUME');
  });

  it('asks for a click on every screen once focus has gone to the host page', () => {
    expect(FOCUS_HINT).toBe('CLICK HERE TO PLAY');
    expect(helpFor({ kind: 'title', cursor: 0 }, 0, false)).toBe(FOCUS_HINT);
    expect(helpFor({ kind: 'paused', cursor: 0, readyElapsedMs: null }, 0, false)).toBe(FOCUS_HINT);
    expect(helpFor({ kind: 'results', cursor: 0, rank: -1 }, 0, false)).toBe(FOCUS_HINT);
    expect(helpFor({ kind: 'nameEntry', name: '' }, 0, false)).toBe(FOCUS_HINT);
  });
});
