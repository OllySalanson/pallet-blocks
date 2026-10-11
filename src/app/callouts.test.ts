import { describe, expect, it } from 'vitest';
import type { LockResult } from '../core/game';
import { describeLock } from './callouts';

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

describe('callouts', () => {
  it('names line clears', () => {
    expect(describeLock(lock({ lines: 1, combo: 0 }))).toEqual(['SINGLE']);
    expect(describeLock(lock({ kind: 'I', lines: 4, combo: 0 }))).toEqual(['QUAD']);
  });

  it('names spins, chains and combos', () => {
    expect(describeLock(lock({ lines: 2, spin: 'full', backToBack: true, combo: 2 }))).toEqual([
      'T-SPIN',
      'DOUBLE',
      'BACK-TO-BACK',
      'COMBO 2',
    ]);
    expect(describeLock(lock({ spin: 'mini' }))).toEqual(['T-SPIN MINI']);
  });

  it('says nothing about a plain lock', () => {
    expect(describeLock(lock({}))).toEqual([]);
  });

  it('calls out an emptied board', () => {
    expect(describeLock(lock({ lines: 4, perfectClear: true, combo: 0 }))).toContain('ALL CLEAR');
  });
});
