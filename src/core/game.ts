import { Bag } from './bag';
import { BOARD_HEIGHT, BOARD_WIDTH, BUFFER_ROWS, Board } from './board';
import { BOX_SIZE, kicksFor, rotateBy, shapeOf, type PieceKind, type Rotation } from './pieces';
import type { Random } from './random';
import {
  HARD_DROP_POINTS_PER_CELL,
  SOFT_DROP_POINTS_PER_CELL,
  TWENTY_G_MS_PER_ROW,
  gravityMsPerRow,
  isDifficultClear,
  levelFor,
  lockPoints,
  type SpinKind,
} from './scoring';

/** What the player can ask for. The keyboard layer maps keys onto these. */
export type GameAction = 'left' | 'right' | 'softDrop' | 'hardDrop' | 'rotateCW' | 'rotateCCW' | 'hold';

export interface ActivePiece {
  readonly kind: PieceKind;
  readonly rotation: Rotation;
  /** The top-left of the piece's box, in board cells. */
  readonly x: number;
  readonly y: number;
}

export interface LockResult {
  readonly kind: PieceKind;
  /** Where the piece locked, in board cells. */
  readonly cells: readonly (readonly [number, number])[];
  readonly lines: number;
  /** The board rows that were cleared, top to bottom, before they collapse. */
  readonly rows: readonly number[];
  readonly spin: SpinKind;
  /** 0 for the first clear in a row, 1 for the second, ...; -1 when nothing cleared. */
  readonly combo: number;
  readonly backToBack: boolean;
  readonly perfectClear: boolean;
  readonly points: number;
}

/** Things that happened during an update, for sound and effects to react to. */
export type GameEvent =
  | { readonly type: 'spawn'; readonly kind: PieceKind }
  | { readonly type: 'move' }
  | { readonly type: 'rotate'; readonly spin: SpinKind }
  | { readonly type: 'hold'; readonly kind: PieceKind }
  | { readonly type: 'softDrop' }
  | { readonly type: 'hardDrop'; readonly distance: number }
  | ({ readonly type: 'lock' } & LockResult)
  | { readonly type: 'levelUp'; readonly level: number }
  | { readonly type: 'gameOver' };

export type GamePhase = 'falling' | 'clearing' | 'over';

export interface GameOptions {
  readonly startLevel?: number;
  readonly random?: Random;
  /** Pieces dealt before the bag takes over. For tests and scripted scenarios. */
  readonly sequence?: readonly PieceKind[];
  /** A board to start on. For tests. */
  readonly board?: Board;
  /** How long a piece may rest on the stack before it locks. */
  readonly lockDelayMs?: number;
  /** How many moves or turns on the stack may restart the lock delay. */
  readonly maxLockResets?: number;
  /** How long cleared lines flash before the stack falls. */
  readonly clearDelayMs?: number;
  /** Delayed auto-shift: how long a direction is held before it repeats. */
  readonly dasMs?: number;
  /** Auto-repeat rate: the time between repeated moves once DAS has charged. 0 is instant. */
  readonly arrMs?: number;
  /** How many times faster than gravity soft drop falls. */
  readonly softDropFactor?: number;
}

export const DEFAULT_LOCK_DELAY_MS = 500;
export const DEFAULT_MAX_LOCK_RESETS = 15;
export const DEFAULT_CLEAR_DELAY_MS = 320;
export const DEFAULT_DAS_MS = 167;
export const DEFAULT_ARR_MS = 33;
export const DEFAULT_SOFT_DROP_FACTOR = 20;
export const PREVIEW_COUNT = 5;

/** The kick that makes a mini spin count as a full one: the long vertical one. */
const LAST_KICK_INDEX = 4;

/** Where the corners of the T's box are, and which two the T points at in each state. */
const T_CORNERS = [
  [0, 0],
  [2, 0],
  [0, 2],
  [2, 2],
] as const;
const T_FRONT_CORNERS: Readonly<Record<Rotation, readonly (readonly [number, number])[]>> = {
  0: [
    [0, 0],
    [2, 0],
  ],
  1: [
    [2, 0],
    [2, 2],
  ],
  2: [
    [0, 2],
    [2, 2],
  ],
  3: [
    [0, 0],
    [0, 2],
  ],
};

/**
 * The rules of the game, with no knowledge of keys, pixels or sound.
 *
 * Drive it with `press`/`release` and `update(dtMs)`; read its state to draw
 * it; and `drainEvents()` once a frame to hear what happened.
 */
export class Game {
  readonly board: Board;
  readonly startLevel: number;

  phase: GamePhase = 'falling';
  piece: ActivePiece | null = null;
  held: PieceKind | null = null;
  canHold = true;

  score = 0;
  lines = 0;
  level: number;
  /** -1 when the last piece cleared nothing. */
  combo = -1;
  /** Whether the last line clear was a difficult one, so the next can be back-to-back. */
  backToBackReady = false;
  piecesPlaced = 0;
  elapsedMs = 0;

  /** The most recent lock that cleared lines, for the HUD to name. */
  lastClear: LockResult | null = null;
  /** The rows being cleared while `phase` is `clearing`. */
  clearingRows: readonly number[] = [];
  clearTimerMs = 0;

  private readonly bag: Bag;
  private readonly sequence: PieceKind[];
  private readonly lockDelayMs: number;
  private readonly maxLockResets: number;
  readonly clearDelayMs: number;
  private readonly dasMs: number;
  private readonly arrMs: number;
  private readonly softDropFactor: number;

  private gravityProgress = 0;
  private lockTimerMs = 0;
  private lockResets = 0;
  private lowestY = 0;
  private lastMoveWasRotation = false;
  private lastKickIndex = 0;

  private readonly heldKeys = { left: false, right: false, softDrop: false };
  private shiftDirection: -1 | 0 | 1 = 0;
  /** Turns and a hold pressed while lines clear, for the next piece as it appears. */
  private bufferedTurns = 0;
  private bufferedHold = false;
  private dasTimerMs = 0;
  private arrTimerMs = 0;

  private events: GameEvent[] = [];

  constructor(options: GameOptions = {}) {
    this.startLevel = Math.max(1, Math.floor(options.startLevel ?? 1));
    this.level = this.startLevel;
    this.board = options.board ?? new Board();
    this.bag = new Bag(options.random ?? Math.random);
    this.sequence = [...(options.sequence ?? [])];
    this.lockDelayMs = options.lockDelayMs ?? DEFAULT_LOCK_DELAY_MS;
    this.maxLockResets = options.maxLockResets ?? DEFAULT_MAX_LOCK_RESETS;
    this.clearDelayMs = options.clearDelayMs ?? DEFAULT_CLEAR_DELAY_MS;
    this.dasMs = options.dasMs ?? DEFAULT_DAS_MS;
    this.arrMs = options.arrMs ?? DEFAULT_ARR_MS;
    this.softDropFactor = options.softDropFactor ?? DEFAULT_SOFT_DROP_FACTOR;
    this.spawn(this.deal());
  }

  /** The next pieces to come, nearest first. */
  get preview(): readonly PieceKind[] {
    const fromSequence = this.sequence.slice(0, PREVIEW_COUNT);
    return [...fromSequence, ...this.bag.peek(PREVIEW_COUNT - fromSequence.length)];
  }

  get isOver(): boolean {
    return this.phase === 'over';
  }

  /** Where the current piece would land if hard dropped. */
  ghostY(): number | null {
    const piece = this.piece;
    if (!piece) {
      return null;
    }
    let y = piece.y;
    while (!this.board.collides(piece.kind, piece.rotation, piece.x, y + 1)) {
      y += 1;
    }
    return y;
  }

  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  press(action: GameAction): void {
    if (this.phase === 'over') {
      return;
    }
    switch (action) {
      case 'left':
      case 'right': {
        this.heldKeys[action] = true;
        this.startShift(action === 'left' ? -1 : 1);
        break;
      }
      case 'softDrop':
        this.heldKeys.softDrop = true;
        break;
      case 'hardDrop':
        this.hardDrop();
        break;
      case 'rotateCW':
      case 'rotateCCW': {
        const turns = action === 'rotateCW' ? 1 : -1;
        if (this.phase === 'clearing') {
          this.bufferedTurns += turns;
        } else {
          this.rotate(turns);
        }
        break;
      }
      case 'hold':
        if (this.phase === 'clearing') {
          this.bufferedHold = true;
        } else {
          this.hold();
        }
        break;
    }
  }

  release(action: GameAction): void {
    if (action === 'left' || action === 'right') {
      this.heldKeys[action] = false;
      const releasedDirection = action === 'left' ? -1 : 1;
      if (this.shiftDirection === releasedDirection) {
        // Fall back to the other direction if it is still held, charging afresh.
        const other = action === 'left' ? 'right' : 'left';
        this.shiftDirection = this.heldKeys[other] ? (other === 'left' ? -1 : 1) : 0;
        this.dasTimerMs = 0;
        this.arrTimerMs = 0;
      }
    } else if (action === 'softDrop') {
      this.heldKeys.softDrop = false;
    }
  }

  /** Lets go of everything, for when the game loses focus. */
  releaseAll(): void {
    this.heldKeys.left = false;
    this.heldKeys.right = false;
    this.heldKeys.softDrop = false;
    this.shiftDirection = 0;
    this.dasTimerMs = 0;
    this.arrTimerMs = 0;
  }

  update(dtMs: number): void {
    if (this.phase === 'over' || dtMs <= 0) {
      return;
    }
    this.elapsedMs += dtMs;
    this.updateAutoShift(dtMs);

    if (this.phase === 'clearing') {
      this.clearTimerMs -= dtMs;
      if (this.clearTimerMs <= 0) {
        this.finishClear();
      }
      return;
    }

    this.updateGravity(dtMs);
    this.updateLock(dtMs);
  }

  // --- Movement --------------------------------------------------------------

  private startShift(direction: -1 | 1): void {
    this.shiftDirection = direction;
    this.dasTimerMs = 0;
    this.arrTimerMs = 0;
    if (this.phase === 'falling') {
      this.shift(direction);
    }
  }

  private updateAutoShift(dtMs: number): void {
    if (this.shiftDirection === 0) {
      return;
    }
    const before = this.dasTimerMs;
    this.dasTimerMs += dtMs;
    if (this.dasTimerMs < this.dasMs || this.phase !== 'falling') {
      return;
    }
    // Time past the moment DAS charged is repeat time.
    this.arrTimerMs += before < this.dasMs ? this.dasTimerMs - this.dasMs : dtMs;
    if (this.arrMs <= 0) {
      while (this.shift(this.shiftDirection)) {
        // Instant auto-repeat: slide to the wall.
      }
      return;
    }
    // The first repeat happens the moment DAS charges.
    if (before < this.dasMs) {
      this.shift(this.shiftDirection);
    }
    while (this.arrTimerMs >= this.arrMs) {
      this.arrTimerMs -= this.arrMs;
      if (!this.shift(this.shiftDirection)) {
        this.arrTimerMs = 0;
        break;
      }
    }
  }

  private shift(dx: -1 | 1): boolean {
    const piece = this.piece;
    if (!piece || this.board.collides(piece.kind, piece.rotation, piece.x + dx, piece.y)) {
      return false;
    }
    const wasGrounded = this.isGrounded();
    this.piece = { ...piece, x: piece.x + dx };
    this.lastMoveWasRotation = false;
    this.afterManipulation(wasGrounded);
    this.events.push({ type: 'move' });
    return true;
  }

  private rotate(turns: 1 | -1): void {
    const piece = this.piece;
    if (!piece || this.phase !== 'falling') {
      return;
    }
    const to = rotateBy(piece.rotation, turns);
    const kicks = kicksFor(piece.kind, piece.rotation, to);
    for (let i = 0; i < kicks.length; i += 1) {
      const [dx, dy] = kicks[i]!;
      if (!this.board.collides(piece.kind, to, piece.x + dx, piece.y + dy)) {
        const wasGrounded = this.isGrounded();
        this.piece = { kind: piece.kind, rotation: to, x: piece.x + dx, y: piece.y + dy };
        this.lastMoveWasRotation = true;
        this.lastKickIndex = i;
        this.afterManipulation(wasGrounded);
        this.events.push({ type: 'rotate', spin: this.detectSpin() });
        return;
      }
    }
  }

  /** A successful move or turn on the stack buys more time, up to a limit. */
  private afterManipulation(wasGrounded: boolean): void {
    this.trackLowest();
    if ((wasGrounded || this.isGrounded()) && this.lockResets < this.maxLockResets) {
      this.lockResets += 1;
      this.lockTimerMs = 0;
    }
  }

  /** Reaching a row lower than ever before gives the piece a fresh set of resets. */
  private trackLowest(): void {
    if (this.piece && this.piece.y > this.lowestY) {
      this.lowestY = this.piece.y;
      this.lockResets = 0;
      this.lockTimerMs = 0;
    }
  }

  private isGrounded(): boolean {
    const piece = this.piece;
    return !!piece && this.board.collides(piece.kind, piece.rotation, piece.x, piece.y + 1);
  }

  private stepDown(): boolean {
    const piece = this.piece;
    if (!piece || this.isGrounded()) {
      return false;
    }
    this.piece = { ...piece, y: piece.y + 1 };
    this.lastMoveWasRotation = false;
    this.trackLowest();
    return true;
  }

  private updateGravity(dtMs: number): void {
    const msPerRow = gravityMsPerRow(this.level);
    const softDropping = this.heldKeys.softDrop;
    const effective = softDropping ? Math.min(msPerRow, msPerRow / this.softDropFactor) : msPerRow;
    this.gravityProgress += dtMs / effective;
    let fell = false;
    while (this.gravityProgress >= 1) {
      if (!this.stepDown()) {
        this.gravityProgress = 0;
        break;
      }
      this.gravityProgress -= 1;
      fell = true;
      if (softDropping) {
        this.score += SOFT_DROP_POINTS_PER_CELL;
      }
    }
    if (fell && softDropping) {
      this.events.push({ type: 'softDrop' });
    }
  }

  private updateLock(dtMs: number): void {
    if (!this.isGrounded()) {
      return;
    }
    this.lockTimerMs += dtMs;
    if (this.lockTimerMs >= this.lockDelayMs || this.lockResets >= this.maxLockResets) {
      this.lockPiece();
    }
  }

  private hardDrop(): void {
    const piece = this.piece;
    if (!piece || this.phase !== 'falling') {
      return;
    }
    const landing = this.ghostY()!;
    const distance = landing - piece.y;
    if (distance > 0) {
      this.piece = { ...piece, y: landing };
      this.lastMoveWasRotation = false;
    }
    this.score += distance * HARD_DROP_POINTS_PER_CELL;
    this.events.push({ type: 'hardDrop', distance });
    this.lockPiece();
  }

  private hold(): void {
    const piece = this.piece;
    if (!piece || !this.canHold || this.phase !== 'falling') {
      return;
    }
    const next = this.held ?? this.deal();
    this.held = piece.kind;
    this.events.push({ type: 'hold', kind: piece.kind });
    this.spawn(next);
    this.canHold = false;
  }

  // --- Spins -----------------------------------------------------------------

  /** The three-corner rule, with the two front corners deciding full or mini. */
  private detectSpin(): SpinKind {
    const piece = this.piece;
    if (!piece || piece.kind !== 'T' || !this.lastMoveWasRotation) {
      return 'none';
    }
    const filled = (cx: number, cy: number) => this.board.isBlocked(piece.x + cx, piece.y + cy);
    const corners = T_CORNERS.filter(([cx, cy]) => filled(cx, cy)).length;
    if (corners < 3) {
      return 'none';
    }
    const front = T_FRONT_CORNERS[piece.rotation].filter(([cx, cy]) => filled(cx, cy)).length;
    return front === 2 || this.lastKickIndex === LAST_KICK_INDEX ? 'full' : 'mini';
  }

  // --- Locking and clearing --------------------------------------------------

  private lockPiece(): void {
    const piece = this.piece;
    if (!piece) {
      return;
    }
    const spin = this.detectSpin();
    this.board.place(piece.kind, piece.rotation, piece.x, piece.y);
    this.piece = null;
    this.piecesPlaced += 1;

    const rows = this.board.fullRows();
    const lines = rows.length;
    const lockedAboveField = this.lockedEntirelyAbove(piece);

    let backToBack = false;
    if (lines > 0) {
      this.combo += 1;
      const difficult = isDifficultClear(lines, spin);
      backToBack = difficult && this.backToBackReady;
      this.backToBackReady = difficult;
    } else {
      this.combo = -1;
    }

    const perfectClear = lines > 0 && this.isPerfectClearAfter(rows);
    const points = lockPoints({
      lines,
      spin,
      level: this.level,
      combo: this.combo,
      backToBack,
      perfectClear,
    });
    this.score += points;

    const result: LockResult = {
      kind: piece.kind,
      cells: pieceCells(piece),
      lines,
      rows,
      spin,
      combo: this.combo,
      backToBack,
      perfectClear,
      points,
    };
    this.events.push({ type: 'lock', ...result });
    if (lines > 0 || spin !== 'none') {
      this.lastClear = result;
    }

    if (lines > 0) {
      this.lines += lines;
      const level = levelFor(this.startLevel, this.lines);
      if (level > this.level) {
        this.level = level;
        this.events.push({ type: 'levelUp', level });
      }
      this.phase = 'clearing';
      this.clearingRows = rows;
      this.clearTimerMs = this.clearDelayMs;
      if (this.clearDelayMs <= 0) {
        this.finishClear();
      }
      return;
    }

    if (lockedAboveField) {
      this.endGame();
      return;
    }
    this.spawn(this.deal());
  }

  private finishClear(): void {
    this.board.removeRows(this.clearingRows);
    this.clearingRows = [];
    this.phase = 'falling';
    this.spawn(this.deal());
    this.applyBufferedInput();
  }

  /** What was pressed during the clear acts on the new piece: a hold first, then the turns. */
  private applyBufferedInput(): void {
    const hold = this.bufferedHold;
    const turns = ((this.bufferedTurns % 4) + 4) % 4;
    this.bufferedHold = false;
    this.bufferedTurns = 0;
    if (this.phase !== 'falling') {
      return;
    }
    if (hold) {
      this.hold();
    }
    if (turns === 3) {
      this.rotate(-1);
    } else {
      for (let i = 0; i < turns; i += 1) {
        this.rotate(1);
      }
    }
  }

  private lockedEntirelyAbove(piece: ActivePiece): boolean {
    return pieceCells(piece).every(([, y]) => y < BUFFER_ROWS);
  }

  private isPerfectClearAfter(rows: readonly number[]): boolean {
    const remaining = new Set(rows);
    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      if (remaining.has(y)) {
        continue;
      }
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        if (this.board.get(x, y) !== null) {
          return false;
        }
      }
    }
    return true;
  }

  // --- Spawning --------------------------------------------------------------

  private deal(): PieceKind {
    return this.sequence.shift() ?? this.bag.next();
  }

  private spawn(kind: PieceKind): void {
    const x = Math.floor((BOARD_WIDTH - BOX_SIZE[kind]) / 2);
    // Every piece appears with its top row on the first visible row.
    const baseY = BUFFER_ROWS - (kind === 'I' ? 1 : 0);
    // If the stack is in the way, it may appear up to two rows higher, in the
    // buffer; only when even that is blocked is the game over.
    for (const y of [baseY, baseY - 1, baseY - 2]) {
      if (!this.board.collides(kind, 0, x, y)) {
        this.piece = { kind, rotation: 0, x, y };
        this.canHold = true;
        this.gravityProgress = 0;
        this.lockTimerMs = 0;
        this.lockResets = 0;
        this.lowestY = y;
        this.lastMoveWasRotation = false;
        this.lastKickIndex = 0;
        this.events.push({ type: 'spawn', kind });
        if (gravityMsPerRow(this.level) <= TWENTY_G_MS_PER_ROW) {
          // At 20G the piece is never seen in the air.
          while (this.stepDown()) {
            // Fall to the stack.
          }
        }
        // A direction already held when the piece appears moves it at once.
        if (this.shiftDirection !== 0 && this.dasTimerMs >= this.dasMs) {
          this.shift(this.shiftDirection);
        }
        return;
      }
    }
    this.piece = { kind, rotation: 0, x, y: baseY };
    this.endGame();
  }

  private endGame(): void {
    this.phase = 'over';
    this.releaseAll();
    this.events.push({ type: 'gameOver' });
  }
}

/** A piece's cells, in board coordinates. */
export function pieceCells(piece: ActivePiece): [number, number][] {
  return shapeOf(piece.kind, piece.rotation).map(([cx, cy]) => [piece.x + cx, piece.y + cy]);
}
