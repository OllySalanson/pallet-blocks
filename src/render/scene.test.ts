import { describe, expect, it } from 'vitest';
import { formatScore, formatTime } from './scene';

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
