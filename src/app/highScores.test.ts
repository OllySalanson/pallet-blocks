import { describe, expect, it } from 'vitest';
import {
  cleanName,
  insertScore,
  isNameCharacter,
  parseScores,
  qualifies,
  type ScoreEntry,
} from './highScores';

const table = (...scores: number[]): ScoreEntry[] => scores.map((score, i) => ({ name: `P${i}`, score }));

describe('high-score table', () => {
  it('takes any positive score while there is room', () => {
    expect(qualifies([], 1)).toBe(true);
    expect(qualifies([], 0)).toBe(false);
    expect(qualifies(table(500, 400), 10, 3)).toBe(true);
  });

  it('only takes a score that beats the lowest once full', () => {
    expect(qualifies(table(500, 400, 300), 300, 3)).toBe(false);
    expect(qualifies(table(500, 400, 300), 301, 3)).toBe(true);
  });

  it('inserts in order, below equal scores, and drops whoever falls off', () => {
    const { table: next, rank } = insertScore(table(500, 400, 300), { name: 'NEW', score: 400 }, 3);
    expect(rank).toBe(2);
    expect(next.map((entry) => entry.name)).toEqual(['P0', 'P1', 'NEW']);
  });

  it('reports a miss with rank -1', () => {
    expect(insertScore(table(500, 400, 300), { name: 'NEW', score: 5 }, 3).rank).toBe(-1);
  });
});

describe('names', () => {
  it('cleans names to what the font can draw', () => {
    expect(cleanName('  ash ketchum the very best ')).toBe('ASH KETCHU');
    expect(cleanName('Leaf<script>')).toBe('LEAFSCRIPT');
    expect(cleanName('   ')).toBe('PLAYER');
    expect(cleanName('émile')).toBe('MILE');
  });

  it('accepts letters, digits and a little punctuation as typed keys', () => {
    expect(isNameCharacter('a')).toBe(true);
    expect(isNameCharacter('7')).toBe(true);
    expect(isNameCharacter('-')).toBe(true);
    expect(isNameCharacter('Enter')).toBe(false);
    expect(isNameCharacter('<')).toBe(false);
  });
});

describe('stored tables', () => {
  it('survives junk', () => {
    expect(parseScores(null)).toEqual([]);
    expect(parseScores('not json')).toEqual([]);
    expect(parseScores('{"a":1}')).toEqual([]);
    expect(parseScores('[{"name":"A","score":"lots"},{"name":"b","score":12.7}]')).toEqual([
      { name: 'B', score: 12, lines: undefined, level: undefined },
    ]);
  });
});
