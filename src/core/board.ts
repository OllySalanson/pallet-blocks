import { shapeOf, type PieceKind, type Rotation } from './pieces';

export const BOARD_WIDTH = 10;
/** Rows the player sees. */
export const VISIBLE_ROWS = 20;
/** Rows above the visible field that pieces may still occupy. */
export const BUFFER_ROWS = 20;
export const BOARD_HEIGHT = VISIBLE_ROWS + BUFFER_ROWS;

/** A filled cell remembers which piece filled it; `G` is a plain grey block. */
export type CellValue = PieceKind | 'G' | null;

/**
 * The well. Row 0 is the top of the hidden buffer; the visible field is rows
 * `BUFFER_ROWS` to `BOARD_HEIGHT - 1`, top to bottom.
 */
export class Board {
  private readonly rows: CellValue[][];

  constructor() {
    this.rows = Array.from({ length: BOARD_HEIGHT }, () => emptyRow());
  }

  /**
   * A board from a picture of its bottom rows, one string per row, top first:
   * `.` is empty and any other letter is a filled cell (a piece letter keeps its
   * colour; anything else is grey).
   */
  static fromRows(picture: readonly string[]): Board {
    const board = new Board();
    const top = BOARD_HEIGHT - picture.length;
    picture.forEach((line, i) => {
      if (line.length !== BOARD_WIDTH) {
        throw new Error(`row ${i} is ${line.length} wide, not ${BOARD_WIDTH}`);
      }
      board.rows[top + i] = [...line].map((ch) => (ch === '.' ? null : isPieceLetter(ch) ? ch : 'G'));
    });
    return board;
  }

  get(x: number, y: number): CellValue {
    return this.rows[y]?.[x] ?? null;
  }

  /** Whether a cell is a wall, the floor, or filled. Above the buffer is open sky. */
  isBlocked(x: number, y: number): boolean {
    if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) {
      return true;
    }
    if (y < 0) {
      return false;
    }
    return this.rows[y]![x] !== null;
  }

  /** Whether a piece placed with its box's top-left at (x, y) overlaps anything. */
  collides(kind: PieceKind, rotation: Rotation, x: number, y: number): boolean {
    return shapeOf(kind, rotation).some(([cx, cy]) => this.isBlocked(x + cx, y + cy));
  }

  /** Writes a piece into the board. */
  place(kind: PieceKind, rotation: Rotation, x: number, y: number): void {
    for (const [cx, cy] of shapeOf(kind, rotation)) {
      const row = this.rows[y + cy];
      if (row) {
        row[x + cx] = kind;
      }
    }
  }

  /** Every completely filled row, top to bottom. */
  fullRows(): number[] {
    const full: number[] = [];
    this.rows.forEach((row, y) => {
      if (row.every((cell) => cell !== null)) {
        full.push(y);
      }
    });
    return full;
  }

  /** Removes the given rows and lets everything above fall into their place. */
  removeRows(rows: readonly number[]): void {
    const doomed = new Set(rows);
    const kept = this.rows.filter((_, y) => !doomed.has(y));
    const fresh = Array.from({ length: BOARD_HEIGHT - kept.length }, () => emptyRow());
    this.rows.splice(0, this.rows.length, ...fresh, ...kept);
  }

  isEmpty(): boolean {
    return this.rows.every((row) => row.every((cell) => cell === null));
  }

  /** Turns every filled cell in a row grey, for the game-over curtain. */
  greyRow(y: number): void {
    const row = this.rows[y];
    if (row) {
      this.rows[y] = row.map((cell) => (cell === null ? null : 'G'));
    }
  }

  /** The board as strings, top to bottom, for tests and debugging. */
  toRows(fromRow = BUFFER_ROWS): string[] {
    return this.rows.slice(fromRow).map((row) => row.map((cell) => cell ?? '.').join(''));
  }
}

const emptyRow = (): CellValue[] => Array.from({ length: BOARD_WIDTH }, () => null);

const isPieceLetter = (ch: string): ch is PieceKind => 'IOTSZJL'.includes(ch);
