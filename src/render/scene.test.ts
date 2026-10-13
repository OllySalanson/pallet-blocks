import { describe, expect, it } from 'vitest';
import { BUFFER_ROWS, VISIBLE_ROWS } from '../core/board';
import { formatScore, formatTime, rowOffset } from './scene';

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
});
