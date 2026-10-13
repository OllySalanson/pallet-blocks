import { describe, expect, it } from 'vitest';
import { BUFFER_ROWS, VISIBLE_ROWS } from '../core/board';
import {
  FOCUS_HINT,
  fitName,
  formatScore,
  formatTime,
  helpFor,
  NAME_FIELD_WIDTH,
  nameLine,
  piecesShown,
  RESULT_ROWS,
  rowOffset,
  tableRows,
  topRowShown,
} from './scene';

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

describe('names in a table', () => {
  // Five pixels a letter, as a stand-in for the pixel font.
  const measure = (text: string) => text.length * 5;

  it('leaves a name that fits alone', () => {
    expect(fitName('OLLY', 20, measure)).toBe('OLLY');
  });

  it('cuts a long name short with a dot, so it never runs into the score', () => {
    const fitted = fitName('WWWWWWWWWW', 32, measure);
    expect(fitted).toBe('WWWWW.');
    expect(measure(fitted)).toBeLessThanOrEqual(32);
  });

  it('never leaves a space before the dot', () => {
    expect(fitName('ASH KETCHUM', 25, measure)).toBe('ASH.');
  });
});

describe('results table', () => {
  const table = Array.from({ length: 10 }, (_, i) => ({ name: `P${i + 1}`, score: 1000 - i * 100 }));

  it('shows the top rows with their places when the player is among them', () => {
    const rows = tableRows(table, 2, RESULT_ROWS);
    expect(rows.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rows.filter((row) => row.mine).map((row) => row.entry.name)).toEqual(['P3']);
  });

  it('puts a player who placed below the top rows in the last row, with their own place', () => {
    const rows = tableRows(table, 8, RESULT_ROWS);
    expect(rows).toHaveLength(RESULT_ROWS);
    expect(rows.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 9]);
    expect(rows[RESULT_ROWS - 1]).toEqual({ entry: table[8], rank: 9, mine: true });
  });

  it('shows just the top rows when the player did not make the table', () => {
    expect(tableRows(table, -1, RESULT_ROWS).map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(tableRows([], -1, RESULT_ROWS)).toEqual([]);
  });
});

describe('name entry', () => {
  const centre = 128;
  const left = centre - NAME_FIELD_WIDTH / 2;
  const right = left + NAME_FIELD_WIDTH - 1;
  // Gaps inside the one-pixel frame, before the first letter and after the caret.
  const gaps = (textWidth: number) => {
    const { textX, caretX } = nameLine(centre, textWidth);
    return { before: textX - (left + 1), after: right - 1 - caretX };
  };

  it('puts the caret in the middle of an empty box', () => {
    const { before, after } = gaps(0);
    expect(Math.abs(before - after)).toBeLessThanOrEqual(1);
  });

  it('keeps the caret clear of the frame for the widest name', () => {
    // Ten Ws is 79px in the pixel font, the widest name there can be.
    const { before, after } = gaps(79);
    expect(after).toBeGreaterThanOrEqual(6);
    expect(Math.abs(before - after)).toBeLessThanOrEqual(1);
  });

  it('leaves a gap between the last letter and the caret', () => {
    const { textX, caretX } = nameLine(centre, 20);
    expect(caretX - (textX + 20)).toBe(2);
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

describe('pieces on show', () => {
  it('hides the stack, HOLD and the NEXT queue while paused, so a pause is no time to plan', () => {
    expect(piecesShown({ kind: 'paused', cursor: 0, readyElapsedMs: null })).toBe(false);
    expect(piecesShown({ kind: 'paused', cursor: 1, readyElapsedMs: 300 })).toBe(false);
  });

  it('shows them in play and once the game is over', () => {
    expect(piecesShown({ kind: 'ready', elapsedMs: 0 })).toBe(true);
    expect(piecesShown({ kind: 'playing' })).toBe(true);
    expect(piecesShown({ kind: 'toppingOut', elapsedMs: 0 })).toBe(true);
    expect(piecesShown({ kind: 'nameEntry', name: '' })).toBe(true);
    expect(piecesShown({ kind: 'results', cursor: 0, rank: -1 })).toBe(true);
  });
});

describe('help bar', () => {
  it('names the keys for the screen while the game has focus', () => {
    expect(helpFor({ kind: 'playing' }, 0, true)).toContain('HOLD');
    expect(helpFor({ kind: 'paused', cursor: 0, readyElapsedMs: null }, 0, true)).toContain('RESUME');
  });

  it('warns on name entry that Esc skips saving the score', () => {
    const help = helpFor({ kind: 'nameEntry', name: '' }, 0, true);
    expect(help).toContain('ENTER SAVE');
    expect(help).toContain('ESC SKIP');
  });

  it('asks for a click on every screen once focus has gone to the host page', () => {
    expect(FOCUS_HINT).toBe('CLICK HERE TO PLAY');
    expect(helpFor({ kind: 'title', cursor: 0 }, 0, false)).toBe(FOCUS_HINT);
    expect(helpFor({ kind: 'paused', cursor: 0, readyElapsedMs: null }, 0, false)).toBe(FOCUS_HINT);
    expect(helpFor({ kind: 'results', cursor: 0, rank: -1 }, 0, false)).toBe(FOCUS_HINT);
    expect(helpFor({ kind: 'nameEntry', name: '' }, 0, false)).toBe(FOCUS_HINT);
  });
});
