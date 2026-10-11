import { describe, expect, it } from 'vitest';
import { clearPoints, gravityMsPerRow, isDifficultClear, levelFor, lockPoints } from './scoring';

const base = { spin: 'none', level: 1, combo: 0, backToBack: false, perfectClear: false } as const;

describe('clear points', () => {
  it('pays 100, 300, 500 and 800 for one to four lines', () => {
    expect([1, 2, 3, 4].map((lines) => clearPoints(lines, 'none'))).toEqual([100, 300, 500, 800]);
  });

  it('pays spins more than plain clears', () => {
    expect([0, 1, 2, 3].map((lines) => clearPoints(lines, 'full'))).toEqual([400, 800, 1200, 1600]);
    expect([0, 1, 2].map((lines) => clearPoints(lines, 'mini'))).toEqual([100, 200, 400]);
  });

  it('multiplies by the level', () => {
    expect(lockPoints({ ...base, lines: 4, level: 5 })).toBe(4000);
  });
});

describe('back-to-back', () => {
  it('counts four-line clears and spins with lines as difficult', () => {
    expect(isDifficultClear(4, 'none')).toBe(true);
    expect(isDifficultClear(1, 'full')).toBe(true);
    expect(isDifficultClear(1, 'mini')).toBe(true);
    expect(isDifficultClear(3, 'none')).toBe(false);
    expect(isDifficultClear(0, 'full')).toBe(false);
  });

  it('adds half again to a back-to-back clear', () => {
    expect(lockPoints({ ...base, lines: 4, backToBack: true })).toBe(1200);
    expect(lockPoints({ ...base, lines: 2, spin: 'full', backToBack: true, level: 2 })).toBe(3600);
  });
});

describe('combos', () => {
  it('adds 50 per combo step, times the level', () => {
    expect(lockPoints({ ...base, lines: 1, combo: 0 })).toBe(100);
    expect(lockPoints({ ...base, lines: 1, combo: 1 })).toBe(150);
    expect(lockPoints({ ...base, lines: 2, combo: 3, level: 2 })).toBe((300 + 150) * 2);
  });

  it('pays no combo for a lock that clears nothing', () => {
    expect(lockPoints({ ...base, lines: 0, combo: 4 })).toBe(0);
  });
});

describe('perfect clears', () => {
  it('pays a bonus for emptying the board', () => {
    expect(lockPoints({ ...base, lines: 1, perfectClear: true })).toBe(100 + 800);
    expect(lockPoints({ ...base, lines: 4, perfectClear: true })).toBe(800 + 2000);
    expect(lockPoints({ ...base, lines: 4, perfectClear: true, backToBack: true })).toBe(1200 + 3200);
  });
});

describe('levels', () => {
  it('goes up a level every ten lines', () => {
    expect(levelFor(1, 0)).toBe(1);
    expect(levelFor(1, 9)).toBe(1);
    expect(levelFor(1, 10)).toBe(2);
    expect(levelFor(1, 95)).toBe(10);
    expect(levelFor(5, 12)).toBe(6);
  });

  it('falls one row a second at level 1 and gets faster every level', () => {
    expect(gravityMsPerRow(1)).toBe(1000);
    for (let level = 2; level <= 20; level += 1) {
      expect(gravityMsPerRow(level)).toBeLessThan(gravityMsPerRow(level - 1));
    }
    expect(gravityMsPerRow(10)).toBeCloseTo(64.15, 1);
  });

  it('stops speeding up at level 20', () => {
    expect(gravityMsPerRow(25)).toBe(gravityMsPerRow(20));
    expect(gravityMsPerRow(20)).toBeLessThan(17);
  });
});
