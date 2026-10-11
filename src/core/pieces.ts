/**
 * The seven pieces, their four rotation states, and the wall kicks tried when a
 * rotation does not fit where it is.
 *
 * Coordinates are `[x, y]` with x to the right and y DOWN, the way the board is
 * stored and drawn. Each piece lives in a square box (3x3, or 4x4 for the I) and
 * rotates about the box's centre, which is the "super rotation" convention most
 * modern falling-block games share. The kick offsets below are written in the
 * same y-down space; the published tables are y-up, so their y signs are flipped.
 */

export type PieceKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export const PIECE_KINDS: readonly PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/** 0 = spawn, 1 = turned clockwise once (R), 2 = upside down, 3 = turned counter-clockwise once (L). */
export type Rotation = 0 | 1 | 2 | 3;

export type Cell = readonly [x: number, y: number];

/** The side of each piece's box. */
export const BOX_SIZE: Readonly<Record<PieceKind, number>> = {
  I: 4,
  O: 4,
  T: 3,
  S: 3,
  Z: 3,
  J: 3,
  L: 3,
};

/** Spawn orientation of every piece: flat side down, in the top rows of its box. */
const SPAWN_CELLS: Readonly<Record<PieceKind, readonly Cell[]>> = {
  I: [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  O: [
    [1, 0],
    [2, 0],
    [1, 1],
    [2, 1],
  ],
  T: [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  S: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  Z: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  J: [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  L: [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
};

const rotateClockwise = (cells: readonly Cell[], size: number): Cell[] =>
  cells.map(([x, y]) => [size - 1 - y, x] as const);

const sortCells = (cells: Cell[]): Cell[] => cells.sort((a, b) => a[1] - b[1] || a[0] - b[0]);

/** `SHAPES[kind][rotation]` is the piece's cells inside its box. */
export const SHAPES: Readonly<Record<PieceKind, readonly (readonly Cell[])[]>> = Object.fromEntries(
  PIECE_KINDS.map((kind) => {
    const size = BOX_SIZE[kind];
    const states: Cell[][] = [];
    let cells: Cell[] = [...SPAWN_CELLS[kind]];
    for (let r = 0; r < 4; r += 1) {
      states.push(sortCells([...cells]));
      // The O does not change shape when turned, and must not drift in its box.
      cells = kind === 'O' ? cells : rotateClockwise(cells, size);
    }
    return [kind, states];
  }),
) as Record<PieceKind, Cell[][]>;

export function shapeOf(kind: PieceKind, rotation: Rotation): readonly Cell[] {
  return SHAPES[kind][rotation]!;
}

export const rotateBy = (rotation: Rotation, turns: 1 | -1): Rotation =>
  ((((rotation + turns) % 4) + 4) % 4) as Rotation;

type KickTable = Readonly<Record<string, readonly Cell[]>>;

/** Offsets for J, L, S, T and Z, keyed `from>to`, y down. */
const JLSTZ_KICKS: KickTable = {
  '0>1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '1>0': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '1>2': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '2>1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '2>3': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  '3>2': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '3>0': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '0>3': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
};

/** Offsets for the I, keyed `from>to`, y down. */
const I_KICKS: KickTable = {
  '0>1': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  '1>0': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  '1>2': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
  '2>1': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  '2>3': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  '3>2': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  '3>0': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  '0>3': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
};

const NO_KICKS: readonly Cell[] = [[0, 0]];

/** The offsets to try, in order, when turning `kind` from one state to the next. */
export function kicksFor(kind: PieceKind, from: Rotation, to: Rotation): readonly Cell[] {
  if (kind === 'O') {
    return NO_KICKS;
  }
  const table = kind === 'I' ? I_KICKS : JLSTZ_KICKS;
  return table[`${from}>${to}`] ?? NO_KICKS;
}
