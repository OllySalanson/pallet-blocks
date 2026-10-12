import { describe, expect, it } from 'vitest';
import type { LockResult } from '../core/game';
import { bannerForLevel, bannerForLock, describeLock, PANEL_LINES } from './callouts';

const lock = (overrides: Partial<LockResult>): LockResult => ({
  kind: 'T',
  cells: [],
  lines: 0,
  rows: [],
  spin: 'none',
  combo: -1,
  backToBack: false,
  perfectClear: false,
  points: 0,
  ...overrides,
});

describe('side panel callouts', () => {
  it('names line clears', () => {
    expect(describeLock(lock({ lines: 1, combo: 0 }))).toEqual(['SINGLE']);
    expect(describeLock(lock({ kind: 'I', lines: 4, combo: 0 }))).toEqual(['QUAD']);
  });

  it('names spins, and shows the back-to-back and combo multipliers', () => {
    expect(describeLock(lock({ lines: 2, spin: 'full', backToBack: true, combo: 2 }))).toEqual([
      'T-SPIN',
      'DOUBLE',
      'B2B x1.5',
      'COMBO x2',
    ]);
    expect(describeLock(lock({ spin: 'mini' }))).toEqual(['T-SPIN MINI']);
  });

  it('says nothing about a plain lock', () => {
    expect(describeLock(lock({}))).toEqual([]);
  });

  it('calls out an emptied board', () => {
    expect(describeLock(lock({ lines: 4, perfectClear: true, combo: 0 }))).toEqual([
      'QUAD',
      'PERFECT',
      'CLEAR',
    ]);
  });

  it('never says more than the panel holds, keeping the most important', () => {
    const lines = describeLock(
      lock({ lines: 1, spin: 'mini', perfectClear: true, backToBack: true, combo: 3 }),
    );
    expect(lines).toHaveLength(PANEL_LINES);
    expect(lines.slice(0, 2)).toEqual(['T-SPIN MINI', 'SINGLE']);
  });
});

describe('banners', () => {
  it('goes up for a quad, with its points', () => {
    expect(bannerForLock(lock({ kind: 'I', lines: 4, combo: 0, points: 2400 }))).toMatchObject({
      headers: [],
      lines: ['QUAD!'],
      footer: '+2,400',
    });
  });

  it('says back-to-back above a chained quad or T-spin', () => {
    expect(bannerForLock(lock({ lines: 4, backToBack: true, points: 1200 }))).toMatchObject({
      headers: ['BACK-TO-BACK'],
      lines: ['QUAD!'],
    });
    expect(bannerForLock(lock({ lines: 2, spin: 'full', backToBack: true, points: 1800 }))).toMatchObject({
      headers: ['BACK-TO-BACK'],
      lines: ['T-SPIN', 'DOUBLE'],
      footer: '+1,800',
    });
  });

  it('goes up for a perfect clear above all else', () => {
    expect(
      bannerForLock(lock({ lines: 4, perfectClear: true, backToBack: true, points: 4800 })),
    ).toMatchObject({
      headers: ['BACK-TO-BACK', 'PERFECT'],
      lines: ['CLEAR!'],
      footer: '+4,800',
    });
  });

  it('stays down for everyday clears, minis and spins that clear nothing', () => {
    expect(bannerForLock(lock({ lines: 3, combo: 4 }))).toBeNull();
    expect(bannerForLock(lock({ lines: 1, spin: 'mini' }))).toBeNull();
    expect(bannerForLock(lock({ spin: 'full' }))).toBeNull();
  });

  it('announces a new level', () => {
    expect(bannerForLevel(3)).toMatchObject({ headers: ['LEVEL UP!'], lines: ['LV 3'] });
  });
});
