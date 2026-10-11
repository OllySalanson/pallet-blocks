import { describe, expect, it } from 'vitest';
import { BUFFER_ROWS, Board } from './board';
import { Game, pieceCells, type GameEvent, type GameOptions } from './game';
import { seededRandom } from './random';

const newGame = (options: GameOptions = {}) =>
  new Game({ random: seededRandom(1), clearDelayMs: 0, ...options });

/** Advances the game in frame-sized steps. */
function run(game: Game, ms: number, step = 1000 / 60): void {
  for (let t = 0; t < ms; t += step) {
    game.update(Math.min(step, ms - t));
  }
}

const eventsOf = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((event): event is Extract<GameEvent, { type: T }> => event.type === type);

/** `rows` empty rows above a picture of the bottom of the board. */
const bottom = (...rows: string[]) => Board.fromRows(rows);

describe('spawning', () => {
  it('deals the pieces in order and shows the next five', () => {
    const game = newGame({ sequence: ['T', 'I', 'O', 'S', 'Z', 'J', 'L'] });
    expect(game.piece?.kind).toBe('T');
    expect(game.preview).toEqual(['I', 'O', 'S', 'Z', 'J']);
  });

  it('puts a new piece in the middle of the top two visible rows', () => {
    const game = newGame({ sequence: ['T'] });
    expect(pieceCells(game.piece!).sort()).toEqual(
      [
        [4, BUFFER_ROWS],
        [3, BUFFER_ROWS + 1],
        [4, BUFFER_ROWS + 1],
        [5, BUFFER_ROWS + 1],
      ].sort(),
    );
    const i = newGame({ sequence: ['I'] });
    expect(pieceCells(i.piece!).map(([x, y]) => `${x},${y}`)).toEqual(['3,20', '4,20', '5,20', '6,20']);
  });
});

describe('moving', () => {
  it('moves once on a tap, then repeats after the auto-shift delay', () => {
    const game = newGame({ sequence: ['T'], dasMs: 160, arrMs: 40 });
    game.press('right');
    expect(game.piece?.x).toBe(4);
    game.update(150);
    expect(game.piece?.x).toBe(4);
    game.update(10);
    expect(game.piece?.x).toBe(5);
    game.update(40);
    expect(game.piece?.x).toBe(6);
    game.release('right');
    game.update(200);
    expect(game.piece?.x).toBe(6);
  });

  it('stops at the walls', () => {
    const game = newGame({ sequence: ['O'] });
    game.press('left');
    run(game, 500);
    expect(Math.min(...pieceCells(game.piece!).map(([x]) => x))).toBe(0);
    game.release('left');
    game.press('right');
    run(game, 500);
    expect(Math.max(...pieceCells(game.piece!).map(([x]) => x))).toBe(9);
  });

  it('lets the newest direction win and goes back to the other on release', () => {
    const game = newGame({ sequence: ['T'], dasMs: 100, arrMs: 1000 });
    game.press('left');
    game.press('right');
    expect(game.piece?.x).toBe(3);
    game.release('right');
    game.update(100);
    expect(game.piece?.x).toBe(2);
  });

  it('falls one row a second at level 1', () => {
    const game = newGame({ sequence: ['T'] });
    const start = game.piece!.y;
    game.update(999);
    expect(game.piece!.y).toBe(start);
    game.update(2);
    expect(game.piece!.y).toBe(start + 1);
  });
});

describe('dropping', () => {
  it('hard drops straight to the floor, locks, and pays two points a row', () => {
    const game = newGame({ sequence: ['T', 'O'] });
    game.press('hardDrop');
    expect(game.board.toRows().slice(-2)).toEqual(['....T.....', '...TTT....']);
    expect(game.score).toBe(18 * 2);
    expect(game.piece?.kind).toBe('O');
  });

  it('soft drops twenty times faster and pays a point a row', () => {
    const game = newGame({ sequence: ['T'] });
    game.press('softDrop');
    game.update(50);
    expect(game.piece!.y).toBe(BUFFER_ROWS + 1);
    expect(game.score).toBe(1);
    game.release('softDrop');
  });

  it('puts the ghost where the piece will land', () => {
    const game = newGame({ sequence: ['I'], board: bottom('##########'.replace(/#/g, '.'), '#####.####') });
    expect(game.ghostY()).toBe(37);
  });
});

describe('rotating', () => {
  it('turns both ways', () => {
    const game = newGame({ sequence: ['T'] });
    game.press('rotateCW');
    expect(game.piece!.rotation).toBe(1);
    game.press('rotateCCW');
    game.press('rotateCCW');
    expect(game.piece!.rotation).toBe(3);
  });

  it('kicks a T off the left wall', () => {
    const game = newGame({ sequence: ['T'] });
    game.piece = { kind: 'T', rotation: 1, x: -1, y: 30 };
    game.press('rotateCCW');
    expect(game.piece).toEqual({ kind: 'T', rotation: 0, x: 0, y: 30 });
  });

  it('kicks an I off the right wall', () => {
    const game = newGame({ sequence: ['I'] });
    game.piece = { kind: 'I', rotation: 1, x: 7, y: 30 };
    game.press('rotateCW');
    expect(game.piece).toEqual({ kind: 'I', rotation: 2, x: 6, y: 30 });
    expect(pieceCells(game.piece).map(([x]) => x)).toEqual([6, 7, 8, 9]);
  });

  it('kicks up off the floor when turning in place would sink into it', () => {
    const game = newGame({ sequence: ['I'] });
    game.piece = { kind: 'I', rotation: 0, x: 3, y: 38 };
    game.press('rotateCW');
    expect(game.piece.rotation).toBe(1);
    expect(Math.max(...pieceCells(game.piece).map(([, y]) => y))).toBe(39);
  });

  it('refuses a turn when no kick fits', () => {
    const game = newGame({
      sequence: ['I'],
      board: bottom('###.######', '###.######', '###.######', '###.######', '###.######'),
    });
    game.piece = { kind: 'I', rotation: 1, x: 1, y: 35 };
    game.press('rotateCW');
    expect(game.piece).toEqual({ kind: 'I', rotation: 1, x: 1, y: 35 });
  });

  it('does not turn the O', () => {
    const game = newGame({ sequence: ['O'] });
    const before = pieceCells(game.piece!);
    game.press('rotateCW');
    expect(pieceCells(game.piece!)).toEqual(before);
  });
});

describe('locking', () => {
  it('locks a resting piece after half a second', () => {
    const game = newGame({ sequence: ['O', 'T'], board: bottom('#########.') });
    game.piece = { kind: 'O', rotation: 0, x: 3, y: 37 };
    game.update(499);
    expect(game.piece?.kind).toBe('O');
    game.update(2);
    expect(game.piece?.kind).toBe('T');
  });

  it('restarts the lock delay when the piece is moved on the stack', () => {
    const game = newGame({ sequence: ['O', 'T'] });
    game.piece = { kind: 'O', rotation: 0, x: 3, y: 38 };
    game.update(400);
    game.press('left');
    game.release('left');
    game.update(400);
    expect(game.piece?.kind).toBe('O');
    game.update(101);
    expect(game.piece?.kind).toBe('T');
  });

  it('stops restarting it after fifteen moves on the stack', () => {
    const game = newGame({ sequence: ['T', 'O'] });
    game.piece = { kind: 'T', rotation: 0, x: 3, y: 38 };
    for (let i = 0; i < 15; i += 1) {
      game.press('rotateCW');
      game.update(100);
    }
    expect(game.piece?.kind).toBe('O');
  });
});

describe('holding', () => {
  it('holds the current piece and deals the next', () => {
    const game = newGame({ sequence: ['T', 'I', 'O'] });
    game.press('hold');
    expect(game.held).toBe('T');
    expect(game.piece?.kind).toBe('I');
  });

  it('allows one hold per piece', () => {
    const game = newGame({ sequence: ['T', 'I', 'O'] });
    game.press('hold');
    game.press('hold');
    expect(game.piece?.kind).toBe('I');
    expect(game.held).toBe('T');
  });

  it('swaps the held piece back in, fresh at the top, after the next lock', () => {
    const game = newGame({ sequence: ['T', 'I', 'O', 'S'] });
    game.press('hold');
    game.press('hardDrop');
    expect(game.piece?.kind).toBe('O');
    game.press('hold');
    expect(game.held).toBe('O');
    expect(game.piece).toMatchObject({ kind: 'T', rotation: 0, x: 3, y: BUFFER_ROWS });
  });
});

describe('clearing lines', () => {
  it('clears a full row and lets the stack fall', () => {
    const game = newGame({ sequence: ['I', 'O'], board: bottom('#.........', '###....###') });
    game.press('hardDrop');
    expect(game.lines).toBe(1);
    expect(game.board.toRows().slice(-1)).toEqual(['G.........']);
    expect(game.score).toBe(100 + 19 * 2);
  });

  it('flashes the cleared rows before they fall', () => {
    const game = newGame({ sequence: ['I', 'O'], board: bottom('###....###'), clearDelayMs: 300 });
    game.press('hardDrop');
    expect(game.phase).toBe('clearing');
    expect(game.clearingRows).toEqual([39]);
    expect(game.piece).toBeNull();
    game.update(299);
    expect(game.phase).toBe('clearing');
    game.update(2);
    expect(game.phase).toBe('falling');
    expect(game.board.isEmpty()).toBe(true);
    expect(game.piece?.kind).toBe('O');
  });

  it('pays for four lines at once', () => {
    const game = newGame({
      sequence: ['I', 'O'],
      board: bottom('G.........', '#########.', '#########.', '#########.', '#########.'),
    });
    game.piece = { kind: 'I', rotation: 1, x: 7, y: 20 };
    game.press('hardDrop');
    const lock = eventsOf(game.drainEvents(), 'lock')[0]!;
    expect(lock.lines).toBe(4);
    expect(lock.points).toBe(800);
  });

  it('builds a combo across consecutive clears and resets it on a miss', () => {
    const game = newGame({
      sequence: ['I', 'I', 'O', 'O'],
      board: bottom('#.........', '###....###', '###....###'),
    });
    game.press('hardDrop'); // clears the bottom row
    game.press('hardDrop'); // and the one that falls into its place
    const locks = eventsOf(game.drainEvents(), 'lock');
    expect(locks.map((lock) => lock.combo)).toEqual([0, 1]);
    expect(locks[1]!.points).toBe(100 + 50);
    game.press('hardDrop'); // an O that clears nothing
    expect(eventsOf(game.drainEvents(), 'lock')[0]!.combo).toBe(-1);
    expect(game.combo).toBe(-1);
  });

  it('pays back-to-back for two four-line clears in a row', () => {
    const rows = Array.from({ length: 8 }, () => '#########.');
    const game = newGame({ sequence: ['I', 'I', 'O'], board: bottom('G.........', ...rows) });
    game.piece = { kind: 'I', rotation: 1, x: 7, y: 20 };
    game.press('hardDrop');
    game.piece = { kind: 'I', rotation: 1, x: 7, y: 20 };
    game.press('hardDrop');
    const locks = eventsOf(game.drainEvents(), 'lock');
    expect(locks.map((lock) => lock.backToBack)).toEqual([false, true]);
    expect(locks[1]!.points).toBe(1200 + 50);
  });

  it('pays a perfect-clear bonus when the board is emptied', () => {
    const game = newGame({ sequence: ['I', 'O'], board: bottom('###....###') });
    game.press('hardDrop');
    const lock = eventsOf(game.drainEvents(), 'lock')[0]!;
    expect(lock.perfectClear).toBe(true);
    expect(lock.points).toBe(100 + 800);
  });
});

describe('spins', () => {
  it('scores a T-spin double when a T is turned into a covered slot', () => {
    const game = newGame({
      sequence: ['T', 'O'],
      board: bottom('...#######', '#...######', '##.#######'),
    });
    game.piece = { kind: 'T', rotation: 1, x: 1, y: 37 };
    game.press('rotateCW');
    expect(eventsOf(game.drainEvents(), 'rotate')[0]!.spin).toBe('full');
    game.press('hardDrop');
    const lock = eventsOf(game.drainEvents(), 'lock')[0]!;
    expect(lock).toMatchObject({ lines: 2, spin: 'full', points: 1200 });
    expect(game.board.toRows().slice(-1)).toEqual(['...GGGGGGG']);
  });

  it('scores a mini spin when only one front corner is covered', () => {
    const game = newGame({ sequence: ['T', 'O'], board: bottom('..#.......', '...#######') });
    game.piece = { kind: 'T', rotation: 1, x: -1, y: 37 };
    game.press('rotateCCW');
    expect(game.piece).toMatchObject({ rotation: 0, x: 0, y: 38 });
    game.press('hardDrop');
    const lock = eventsOf(game.drainEvents(), 'lock')[0]!;
    expect(lock).toMatchObject({ lines: 1, spin: 'mini', points: 200 });
  });

  it('is no spin unless the last thing the T did was turn', () => {
    const game = newGame({
      sequence: ['T', 'O'],
      board: bottom('...#######', '#...######', '##.#######'),
    });
    game.piece = { kind: 'T', rotation: 2, x: 1, y: 37 };
    game.press('hardDrop');
    expect(eventsOf(game.drainEvents(), 'lock')[0]).toMatchObject({ lines: 2, spin: 'none', points: 300 });
  });
});

describe('levels', () => {
  it('goes up a level every ten lines and falls faster', () => {
    const game = newGame({ sequence: ['I', 'O'], board: bottom('###....###') });
    game.lines = 9;
    game.press('hardDrop');
    expect(game.level).toBe(2);
    expect(eventsOf(game.drainEvents(), 'levelUp')).toEqual([{ type: 'levelUp', level: 2 }]);
    const y = game.piece!.y;
    game.update(800);
    expect(game.piece!.y).toBe(y + 1);
  });

  it('starts on the chosen level and pays at that level', () => {
    const game = newGame({ startLevel: 5, sequence: ['I', 'O'], board: bottom('###....###') });
    game.piece = { ...game.piece!, y: 38 };
    game.press('hardDrop');
    expect(game.level).toBe(5);
    expect(game.score).toBe((100 + 800) * 5);
  });
});

describe('game over', () => {
  it('ends when a new piece has nowhere to appear', () => {
    const rows = Array.from({ length: 24 }, () => '#########.');
    const game = newGame({ sequence: ['T'], board: bottom(...rows) });
    expect(game.phase).toBe('over');
    expect(game.isOver).toBe(true);
  });

  it('ends when a piece locks entirely above the field', () => {
    const rows = Array.from({ length: 18 }, () => '#########.');
    const game = newGame({ sequence: ['O', 'O'], board: bottom(...rows) });
    game.press('hardDrop');
    expect(game.phase).toBe('falling');
    expect(game.piece!.y).toBeLessThan(BUFFER_ROWS);
    game.press('hardDrop');
    expect(game.phase).toBe('over');
    expect(eventsOf(game.drainEvents(), 'gameOver')).toHaveLength(1);
  });

  it('ignores input once over', () => {
    const rows = Array.from({ length: 24 }, () => '#########.');
    const game = newGame({ sequence: ['T'], board: bottom(...rows) });
    const score = game.score;
    game.press('hardDrop');
    game.update(1000);
    expect(game.score).toBe(score);
  });
});

describe('a whole game', () => {
  it('plays to the end by hard dropping, with a consistent score', () => {
    const game = new Game({ random: seededRandom(5) });
    let total = 0;
    let guard = 0;
    while (!game.isOver && guard < 1000) {
      game.press('hardDrop');
      game.update(1000);
      for (const event of game.drainEvents()) {
        if (event.type === 'lock') {
          total += event.points;
        } else if (event.type === 'hardDrop') {
          total += event.distance * 2;
        }
      }
      guard += 1;
    }
    expect(game.isOver).toBe(true);
    expect(game.score).toBe(total);
  });
});
