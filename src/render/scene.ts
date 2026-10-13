import { BOARD_WIDTH, BUFFER_ROWS, VISIBLE_ROWS, type CellValue } from '../core/board';
import { pieceCells, type Game } from '../core/game';
import { shapeOf, type PieceKind } from '../core/pieces';
import type { Banner } from '../app/callouts';
import type { ScoreEntry } from '../app/highScores';
import { CURTAIN_ROW_MS, GO_MS, PAUSE_ITEMS, READY_MS, RESULT_ITEMS, type Screen } from '../app/screens';
import {
  BACKDROP,
  BACKDROP_BAND,
  BAR,
  BAR_MUTED,
  BAR_TEXT,
  BLOCK_TONES,
  CREAM,
  CREAM_DIM,
  CREAM_LIT,
  FRAME,
  GOLD,
  GOLD_WASH,
  INK,
  INK_SOFT,
  RED,
  SHADOW,
  TITLE_DEPTH,
  TITLE_FILL,
  TITLE_RIM,
  WELL,
  WELL_GRID,
  type BlockTones,
} from './palette';
import type { PixelFont, TextStyle } from './pixelFont';

/** The game's own resolution. It is drawn at this size and scaled up by whole pixels. */
export const SCREEN_WIDTH = 256;
export const SCREEN_HEIGHT = 208;

const CELL = 8;
const BAR_HEIGHT = 16;

/** The well: a cream window with a dark field inset two pixels inside its frame. */
const WELL_FRAME = { x: 85, y: 21, width: 86, height: 166 };
const FIELD_X = WELL_FRAME.x + 3;
const FIELD_Y = WELL_FRAME.y + 3;
const FIELD_WIDTH = BOARD_WIDTH * CELL;
const FIELD_HEIGHT = VISIBLE_ROWS * CELL;

/**
 * The buffer row just above the field shows above the well, between it and the
 * title bar, so a piece a high stack pushes up there is still seen whole.
 */
const PEEK_ROW = BUFFER_ROWS - 1;

/** How far below the top of the field a board row is drawn, or null for a buffer row out of sight. */
export function rowOffset(boardY: number): number | null {
  return boardY >= PEEK_ROW ? (boardY - BUFFER_ROWS) * CELL : null;
}

/**
 * The top board row drawn on a screen. The results window covers the top of
 * the well but not the strip above it, so there the buffer row is left out
 * rather than poke out above the window as a stub.
 */
export function topRowShown(screen: Screen): number {
  return screen.kind === 'results' ? BUFFER_ROWS : PEEK_ROW;
}

const COLUMN_WIDTH = 74;
const LEFT_X = 5;
const RIGHT_X = SCREEN_WIDTH - 5 - COLUMN_WIDTH;

const HOLD_BOX = { x: LEFT_X, y: 21, width: COLUMN_WIDTH, height: 42 };
const STATS_BOX = { x: LEFT_X, y: 67, width: COLUMN_WIDTH, height: 58 };
const CALLOUT_BOX = { x: LEFT_X, y: 129, width: COLUMN_WIDTH, height: 58 };
const NEXT_BOX = { x: RIGHT_X, y: 21, width: COLUMN_WIDTH, height: 124 };
const BEST_BOX = { x: RIGHT_X, y: 149, width: COLUMN_WIDTH, height: 38 };

/** How long a callout stays up. */
export const CALLOUT_MS = 1800;
/** Callouts and banners blink this long as they arrive, then hold steady. */
const ARRIVAL_BLINK_MS = 240;
/** The curtain greys the field and then the peeking row above it. */
const CURTAIN_ALL_ROWS = VISIBLE_ROWS + 1;
const LOCK_FLASH_MS = 90;
const DROP_TRAIL_MS = 140;
const DROP_BUMP_MS = 70;

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Callout {
  readonly lines: readonly string[];
  readonly points: number;
  readonly atMs: number;
}

/** A banner, and when it went up. */
export interface ShownBanner extends Banner {
  readonly atMs: number;
}

export interface DropTrail {
  readonly columns: readonly { readonly x: number; readonly fromY: number; readonly toY: number }[];
  readonly kind: PieceKind;
  readonly atMs: number;
}

export interface LockFlash {
  readonly cells: readonly (readonly [number, number])[];
  readonly atMs: number;
}

/** Everything the renderer needs to draw one frame. */
export interface SceneState {
  readonly screen: Screen;
  readonly game: Game | null;
  readonly nowMs: number;
  /** The clock callouts, banners, flashes and trails are timed by; it stands still while paused. */
  readonly effectsMs: number;
  readonly muted: boolean;
  readonly playerName: string | null;
  readonly titleItems: readonly string[];
  readonly best: number;
  readonly table: readonly ScoreEntry[];
  readonly tableTitle: string;
  /** Row of `table` to pick out, or -1. */
  readonly highlight: number;
  readonly callout: Callout | null;
  readonly banner: ShownBanner | null;
  readonly trail: DropTrail | null;
  readonly flash: LockFlash | null;
}

const TITLE_TEXT: TextStyle = { color: TITLE_FILL, outline: TITLE_RIM, depth: { color: TITLE_DEPTH, px: 1 } };

export class SceneRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly font: PixelFont;

  constructor(ctx: CanvasRenderingContext2D, font: PixelFont) {
    this.ctx = ctx;
    this.font = font;
  }

  draw(state: SceneState): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    this.backdrop();

    if (state.screen.kind === 'title') {
      this.titleScreen(state);
    } else {
      this.playfield(state);
      if (state.screen.kind === 'paused') {
        this.pauseMenu(state.screen.cursor);
      } else if (state.screen.kind === 'nameEntry') {
        this.nameEntry(state, state.screen.name);
      } else if (state.screen.kind === 'results') {
        this.results(state, state.screen.cursor);
      }
    }

    this.titleBar(state);
    this.helpBar(helpFor(state));
  }

  // --- Chrome ----------------------------------------------------------------

  private backdrop(): void {
    const ctx = this.ctx;
    ctx.fillStyle = BACKDROP;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    // Two-pixel bands, the way the party screens of the handheld games are never one flat colour.
    ctx.fillStyle = BACKDROP_BAND;
    for (let y = 2; y < SCREEN_HEIGHT; y += 4) {
      ctx.fillRect(0, y, SCREEN_WIDTH, 2);
    }
  }

  private titleBar(state: SceneState): void {
    const ctx = this.ctx;
    ctx.fillStyle = BAR;
    ctx.fillRect(0, 0, SCREEN_WIDTH, BAR_HEIGHT);
    ctx.fillStyle = FRAME;
    ctx.fillRect(0, BAR_HEIGHT, SCREEN_WIDTH, 1);
    const textY = Math.floor((BAR_HEIGHT - this.font.capHeight) / 2);
    this.text('PALLET BLOCKS', 6, textY, { color: GOLD });
    const right = [state.playerName, state.muted ? 'SOUND OFF' : null].filter(Boolean).join('  ');
    if (right) {
      this.text(right, SCREEN_WIDTH - 6, textY, { color: BAR_MUTED, align: 'right' });
    }
  }

  private helpBar(hint: string): void {
    const ctx = this.ctx;
    const top = SCREEN_HEIGHT - BAR_HEIGHT;
    ctx.fillStyle = FRAME;
    ctx.fillRect(0, top - 1, SCREEN_WIDTH, 1);
    ctx.fillStyle = BAR;
    ctx.fillRect(0, top, SCREEN_WIDTH, BAR_HEIGHT);
    this.text(hint, SCREEN_WIDTH / 2, top + Math.floor((BAR_HEIGHT - this.font.capHeight) / 2), {
      color: BAR_TEXT,
      align: 'center',
    });
  }

  // --- The playfield ---------------------------------------------------------

  private playfield(state: SceneState): void {
    const game = state.game;
    if (!game) {
      return;
    }
    this.window(HOLD_BOX);
    this.heading('HOLD', HOLD_BOX);
    if (game.held) {
      this.previewPiece(game.held, HOLD_BOX.x, HOLD_BOX.y + 18, HOLD_BOX.width, 18, !game.canHold);
    }

    this.stats(game, state);
    this.callout(state, game);

    this.window(NEXT_BOX);
    this.heading('NEXT', NEXT_BOX);
    game.preview.forEach((kind, i) => {
      this.previewPiece(kind, NEXT_BOX.x, NEXT_BOX.y + 18 + i * 21, NEXT_BOX.width, 18, false);
    });

    this.window(BEST_BOX);
    this.heading(state.tableTitle === 'LEADERBOARD' ? 'TOP SCORE' : 'BEST', BEST_BOX);
    this.text(
      formatScore(Math.max(state.best, game.score)),
      BEST_BOX.x + BEST_BOX.width - 6,
      BEST_BOX.y + 21,
      {
        color: INK,
        align: 'right',
      },
    );

    this.well(state, game);
  }

  private stats(game: Game, state: SceneState): void {
    const box = STATS_BOX;
    this.window(box);
    const left = box.x + 6;
    const right = box.x + box.width - 6;
    this.heading('SCORE', box);
    this.text(formatScore(game.score), right, box.y + 18, { color: INK, align: 'right' });
    this.divider(box, box.y + 31);
    // While a new level is announced its row flashes: the speed has just gone up.
    const banner = state.banner?.kind === 'level' ? state.banner : null;
    const sinceLevelUp = banner ? state.effectsMs - banner.atMs : Infinity;
    const levelLit = !!banner && sinceLevelUp < banner.durationMs && Math.floor(sinceLevelUp / 150) % 2 === 0;
    if (levelLit) {
      this.ctx.fillStyle = GOLD_WASH;
      this.ctx.fillRect(box.x + 3, box.y + 33, box.width - 6, 12);
    }
    this.text('LEVEL', left, box.y + 35, { color: levelLit ? RED : INK_SOFT });
    this.text(String(game.level), right, box.y + 35, { color: levelLit ? RED : INK, align: 'right' });
    this.text('LINES', left, box.y + 46, { color: INK_SOFT });
    this.text(String(game.lines), right, box.y + 46, { color: INK, align: 'right' });
  }

  private callout(state: SceneState, game: Game): void {
    const box = CALLOUT_BOX;
    const callout = state.callout;
    if (!callout || state.effectsMs - callout.atMs > CALLOUT_MS) {
      // Between callouts the panel keeps time.
      this.window(box);
      this.heading('TIME', box);
      this.text(formatTime(game.elapsedMs), box.x + box.width - 6, box.y + 18, {
        color: INK,
        align: 'right',
      });
      this.divider(box, box.y + 31);
      this.text('PIECES', box.x + 6, box.y + 35, { color: INK_SOFT });
      this.text(String(game.piecesPlaced), box.x + box.width - 6, box.y + 35, { color: INK, align: 'right' });
      return;
    }
    this.window(box, CREAM_LIT);
    if (isBlinkedOut(state.effectsMs - callout.atMs)) {
      return;
    }
    const centre = box.x + box.width / 2;
    const dividerY = box.y + 44;
    // The words sit in the middle of the space above the points.
    const lines = callout.lines.slice(0, 4);
    const step = this.font.capHeight + 2;
    const top = box.y + 1 + Math.floor((dividerY - box.y - 1 - (lines.length * step - 2)) / 2);
    lines.forEach((line, i) => {
      this.text(line, centre, top + i * step, { color: i === 0 ? RED : INK, align: 'center' });
    });
    if (callout.points > 0) {
      this.divider(box, dividerY);
      this.text(`+${formatScore(callout.points)}`, centre, dividerY + 3, { color: INK, align: 'center' });
    }
  }

  private well(state: SceneState, game: Game): void {
    const ctx = this.ctx;
    const screen = state.screen;
    const bump = state.trail && state.effectsMs - state.trail.atMs < DROP_BUMP_MS ? 1 : 0;
    this.window({ ...WELL_FRAME, y: WELL_FRAME.y + bump });
    const fieldY = FIELD_Y + bump;

    ctx.fillStyle = WELL;
    ctx.fillRect(FIELD_X, fieldY, FIELD_WIDTH, FIELD_HEIGHT);

    if (screen.kind === 'paused') {
      // The stack is hidden while paused, so a pause is not a free look.
      return;
    }

    // A dot at every cell corner: enough of a grid to line up by, quiet enough to ignore.
    ctx.fillStyle = WELL_GRID;
    for (let x = 1; x < BOARD_WIDTH; x += 1) {
      for (let y = 1; y < VISIBLE_ROWS; y += 1) {
        ctx.fillRect(FIELD_X + x * CELL - 1, fieldY + y * CELL - 1, 2, 2);
      }
    }

    const curtainRows = this.curtainRows(screen);
    const clearing = game.phase === 'clearing' ? new Set(game.clearingRows) : null;
    const clearProgress = clearing ? 1 - Math.max(0, game.clearTimerMs) / Math.max(1, game.clearDelayMs) : 0;

    for (let y = topRowShown(screen); y < BUFFER_ROWS + VISIBLE_ROWS; y += 1) {
      const greyed = BUFFER_ROWS + VISIBLE_ROWS - y <= curtainRows;
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        const cell: CellValue = game.board.get(x, y);
        if (!cell) {
          continue;
        }
        const px = FIELD_X + x * CELL;
        const py = fieldY + rowOffset(y)!;
        if (clearing?.has(y)) {
          this.clearingCell(px, py, x, clearProgress, state.nowMs);
          continue;
        }
        const flashing =
          state.flash &&
          state.effectsMs - state.flash.atMs < LOCK_FLASH_MS &&
          state.flash.cells.some(([fx, fy]) => fx === x && fy === y);
        this.block(px, py, BLOCK_TONES[greyed ? 'G' : cell], flashing ? 'flash' : 'normal');
      }
    }

    this.dropTrail(state, fieldY);

    const piece = game.piece;
    const live = screen.kind === 'playing' || screen.kind === 'ready';
    if (piece && live) {
      const ghostY = game.ghostY();
      if (ghostY !== null && ghostY !== piece.y) {
        for (const [x, y] of pieceCells({ ...piece, y: ghostY })) {
          const offset = rowOffset(y);
          if (offset !== null) {
            this.ghost(FIELD_X + x * CELL, fieldY + offset, BLOCK_TONES[piece.kind]);
          }
        }
      }
      for (const [x, y] of pieceCells(piece)) {
        const offset = rowOffset(y);
        if (offset !== null) {
          this.block(FIELD_X + x * CELL, fieldY + offset, BLOCK_TONES[piece.kind], 'normal');
        }
      }
    }

    if (live && state.banner) {
      this.banner(state.banner, state.effectsMs, fieldY);
    }

    if (screen.kind === 'ready') {
      const word = screen.elapsedMs < READY_MS ? 'READY' : 'GO!';
      if (screen.elapsedMs < READY_MS + GO_MS) {
        this.text(word, FIELD_X + FIELD_WIDTH / 2, fieldY + 56, { ...TITLE_TEXT, align: 'center', scale: 2 });
      }
    }
    if (screen.kind === 'toppingOut' && screen.elapsedMs > VISIBLE_ROWS * CURTAIN_ROW_MS) {
      this.text('GAME', FIELD_X + FIELD_WIDTH / 2, fieldY + 52, { ...TITLE_TEXT, align: 'center', scale: 2 });
      this.text('OVER', FIELD_X + FIELD_WIDTH / 2, fieldY + 76, { ...TITLE_TEXT, align: 'center', scale: 2 });
    }
  }

  /** A big moment across the middle of the well: lettering only, so the stack shows through around it. */
  private banner(banner: ShownBanner, effectsMs: number, fieldY: number): void {
    const age = effectsMs - banner.atMs;
    if (age >= banner.durationMs || isBlinkedOut(age)) {
      return;
    }
    const font = this.font;
    const centre = FIELD_X + FIELD_WIDTH / 2;
    const small = font.capHeight;
    // Big lines are lettered at twice size when they fit inside the well with a pixel to spare.
    const scaleFor = (line: string) => (font.measure(line, 2) + 4 <= FIELD_WIDTH - 2 ? 2 : 1);
    const parts: { text: string; height: number; big: boolean; style: TextStyle }[] = [];
    for (const header of banner.headers) {
      parts.push({ text: header, height: small, big: false, style: { color: GOLD, outline: FRAME } });
    }
    for (const line of banner.lines) {
      const scale = scaleFor(line);
      parts.push({ text: line, height: scale * small, big: true, style: { ...TITLE_TEXT, scale } });
    }
    if (banner.footer) {
      parts.push({
        text: banner.footer,
        height: small,
        big: false,
        style: { color: CREAM_LIT, outline: FRAME },
      });
    }
    // Room between big lines for their outline and depth, as GAME OVER has.
    const gapAfter = (i: number) => (parts[i]!.big && parts[i + 1]?.big ? 8 : 5);
    const height = parts.reduce(
      (sum, part, i) => sum + part.height + (i < parts.length - 1 ? gapAfter(i) : 0),
      0,
    );
    // Rises into place as it arrives.
    const rise = Math.max(0, 4 - Math.floor(age / 40));
    let y = fieldY + Math.round(FIELD_HEIGHT * 0.42 - height / 2) + rise;
    parts.forEach((part, i) => {
      this.text(part.text, centre, y, { ...part.style, align: 'center' });
      y += part.height + gapAfter(i);
    });
  }

  private curtainRows(screen: Screen): number {
    if (screen.kind === 'toppingOut') {
      return Math.min(CURTAIN_ALL_ROWS, Math.floor(screen.elapsedMs / CURTAIN_ROW_MS));
    }
    return screen.kind === 'nameEntry' || screen.kind === 'results' ? CURTAIN_ALL_ROWS : 0;
  }

  /** A cleared row wipes out from the middle, flashing as it goes. */
  private clearingCell(px: number, py: number, column: number, progress: number, nowMs: number): void {
    const distance = Math.abs(column + 0.5 - BOARD_WIDTH / 2);
    if (distance < progress * (BOARD_WIDTH / 2 + 1)) {
      return;
    }
    const ctx = this.ctx;
    ctx.fillStyle = Math.floor(nowMs / 50) % 2 === 0 ? CREAM_LIT : CREAM;
    ctx.fillRect(px, py, CELL, CELL);
  }

  private dropTrail(state: SceneState, fieldY: number): void {
    const trail = state.trail;
    if (!trail) {
      return;
    }
    const age = state.effectsMs - trail.atMs;
    if (age >= DROP_TRAIL_MS) {
      return;
    }
    const ctx = this.ctx;
    const tones = BLOCK_TONES[trail.kind];
    // The streak shortens from the top as it fades.
    const fade = age / DROP_TRAIL_MS;
    for (const column of trail.columns) {
      const top = column.fromY + (column.toY - column.fromY) * fade;
      const fromRow = Math.max(top, BUFFER_ROWS) - BUFFER_ROWS;
      const toRow = column.toY - BUFFER_ROWS;
      if (toRow <= fromRow) {
        continue;
      }
      const y0 = fieldY + Math.round(fromRow * CELL);
      const y1 = fieldY + toRow * CELL;
      ctx.fillStyle = tones.dark;
      ctx.fillRect(FIELD_X + column.x * CELL + 2, y0, CELL - 4, y1 - y0);
      ctx.fillStyle = tones.base;
      ctx.fillRect(FIELD_X + column.x * CELL + 3, y0, CELL - 6, y1 - y0);
    }
  }

  // --- Pieces ----------------------------------------------------------------

  /** One 8x8 block: lit top-left edge, shaded bottom-right edge, a glint in the corner. */
  private block(px: number, py: number, tones: BlockTones, mode: 'normal' | 'flash' | 'dim'): void {
    const ctx = this.ctx;
    if (mode === 'flash') {
      ctx.fillStyle = CREAM_LIT;
      ctx.fillRect(px, py, CELL, CELL);
      return;
    }
    const t = mode === 'dim' ? BLOCK_TONES.G : tones;
    ctx.fillStyle = t.base;
    ctx.fillRect(px, py, CELL, CELL);
    ctx.fillStyle = t.light;
    ctx.fillRect(px, py, CELL - 1, 1);
    ctx.fillRect(px, py + 1, 1, CELL - 2);
    ctx.fillStyle = t.dark;
    ctx.fillRect(px, py + CELL - 1, CELL, 1);
    ctx.fillRect(px + CELL - 1, py, 1, CELL - 1);
    ctx.fillStyle = CREAM_LIT;
    ctx.fillRect(px + 1, py + 1, 2, 1);
    ctx.fillRect(px + 1, py + 2, 1, 1);
  }

  /** Where the piece will land: its outline, in its own colour. */
  private ghost(px: number, py: number, tones: BlockTones): void {
    const ctx = this.ctx;
    ctx.fillStyle = tones.dark;
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = tones.base;
    ctx.fillRect(px, py, CELL, 1);
    ctx.fillRect(px, py + CELL - 1, CELL, 1);
    ctx.fillRect(px, py + 1, 1, CELL - 2);
    ctx.fillRect(px + CELL - 1, py + 1, 1, CELL - 2);
    ctx.fillStyle = WELL;
    ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
  }

  /** A piece centred in a slot of a side window, as it looks when it spawns. */
  private previewPiece(
    kind: PieceKind,
    x: number,
    y: number,
    width: number,
    height: number,
    dim: boolean,
  ): void {
    const cells = shapeOf(kind, 0);
    const xs = cells.map(([cx]) => cx);
    const ys = cells.map(([, cy]) => cy);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = (Math.max(...xs) - minX + 1) * CELL;
    const h = (Math.max(...ys) - minY + 1) * CELL;
    const left = x + Math.floor((width - w) / 2);
    const top = y + Math.floor((height - h) / 2);
    for (const [cx, cy] of cells) {
      this.block(
        left + (cx - minX) * CELL,
        top + (cy - minY) * CELL,
        BLOCK_TONES[kind],
        dim ? 'dim' : 'normal',
      );
    }
  }

  // --- Menus and windows -----------------------------------------------------

  private pauseMenu(cursor: number): void {
    const box = { x: FIELD_X + 6, y: 70, width: FIELD_WIDTH - 12, height: 62 };
    this.window(box);
    this.text('PAUSED', box.x + box.width / 2, box.y + 6, { color: RED, align: 'center' });
    this.divider(box, box.y + 19);
    this.menu(PAUSE_ITEMS, cursor, box.x + 12, box.y + 24, 12);
  }

  private nameEntry(state: SceneState, name: string): void {
    const box = { x: 40, y: 54, width: SCREEN_WIDTH - 80, height: 84 };
    this.shade();
    this.window(box);
    const centre = box.x + box.width / 2;
    this.text('NEW HIGH SCORE!', centre, box.y + 7, { color: RED, align: 'center' });
    this.text(formatScore(state.game?.score ?? 0), centre, box.y + 21, { color: INK, align: 'center' });
    this.divider(box, box.y + 35);
    this.text('ENTER YOUR NAME', centre, box.y + 40, { color: INK_SOFT, align: 'center' });

    const field = { x: centre - 46, y: box.y + 54, width: 92, height: 18 };
    this.window(field, CREAM_LIT);
    const textWidth = this.font.measure(name);
    const textX = Math.floor(centre - textWidth / 2);
    this.text(name, textX, field.y + 5, { color: INK });
    if (Math.floor(state.nowMs / 400) % 2 === 0) {
      this.ctx.fillStyle = INK;
      this.ctx.fillRect(textX + textWidth + (name ? 2 : 0), field.y + 4, 1, this.font.capHeight + 1);
    }
  }

  private results(state: SceneState, cursor: number): void {
    const game = state.game;
    const box = { x: 28, y: 22, width: SCREEN_WIDTH - 56, height: 164 };
    this.shade();
    this.window(box);
    const centre = box.x + box.width / 2;
    this.text('GAME OVER', centre, box.y + 6, { ...TITLE_TEXT, align: 'center', scale: 2 });

    const left = box.x + 10;
    const right = box.x + box.width - 10;
    if (game) {
      const stats: [string, string][] = [
        ['SCORE', formatScore(game.score)],
        ['LEVEL', String(game.level)],
        ['LINES', String(game.lines)],
      ];
      stats.forEach(([label, value], i) => {
        const x = box.x + Math.round((box.width * (2 * i + 1)) / 6);
        this.text(label, x, box.y + 29, { color: INK_SOFT, align: 'center' });
        this.text(value, x, box.y + 40, { color: INK, align: 'center' });
      });
    }
    this.divider(box, box.y + 54);

    this.text(state.tableTitle, centre, box.y + 59, { color: RED, align: 'center' });
    const rows = state.table.slice(0, 6);
    if (rows.length === 0) {
      this.text('NO SCORES YET', centre, box.y + 86, { color: INK_SOFT, align: 'center' });
    }
    rows.forEach((entry, i) => {
      const y = box.y + 73 + i * 11;
      const mine = i === state.highlight;
      if (mine) {
        this.ctx.fillStyle = Math.floor(state.nowMs / 300) % 2 === 0 ? GOLD : CREAM_DIM;
        this.ctx.fillRect(box.x + 4, y - 2, box.width - 8, 11);
      }
      this.text(`${i + 1}`, left + 8, y, { color: INK_SOFT, align: 'right' });
      this.text(entry.name, left + 16, y, { color: INK });
      this.text(formatScore(entry.score), right, y, { color: INK, align: 'right' });
    });

    this.divider(box, box.y + box.height - 21);
    const itemY = box.y + box.height - 15;
    RESULT_ITEMS.forEach((item, i) => {
      const x = i === 0 ? box.x + 24 : box.x + box.width - 70;
      this.text(item, x, itemY, { color: INK });
      if (i === cursor) {
        this.cursor(x - 7, itemY + 1);
      }
    });
  }

  private titleScreen(state: SceneState): void {
    this.fallingDecor(state.nowMs);

    const centre = SCREEN_WIDTH / 2;
    this.text('PALLET', centre, 26, { ...TITLE_TEXT, align: 'center', scale: 3 });
    this.text('BLOCKS', centre, 56, { ...TITLE_TEXT, align: 'center', scale: 3 });

    const tableBox = { x: 125, y: 94, width: 110, height: 92 };
    const menuHeight = 14 + state.titleItems.length * 13;
    const menuBox = {
      x: 21,
      y: tableBox.y + Math.floor((tableBox.height - menuHeight) / 2),
      width: 96,
      height: menuHeight,
    };
    this.window(menuBox);
    const cursor = state.screen.kind === 'title' ? state.screen.cursor : 0;
    this.menu(state.titleItems, cursor, menuBox.x + 12, menuBox.y + 8, 13);

    this.window(tableBox);
    this.heading(state.tableTitle, tableBox);
    const rows = state.table.slice(0, 6);
    if (rows.length === 0) {
      this.text('NO SCORES YET', tableBox.x + tableBox.width / 2, tableBox.y + 40, {
        color: INK_SOFT,
        align: 'center',
      });
    }
    rows.forEach((entry, i) => {
      const y = tableBox.y + 19 + i * 12;
      this.text(entry.name, tableBox.x + 6, y, { color: INK });
      this.text(formatScore(entry.score), tableBox.x + tableBox.width - 6, y, { color: INK, align: 'right' });
    });
  }

  /** Pieces drifting down behind the title, in the backdrop's own blues. */
  private fallingDecor(nowMs: number): void {
    const kinds: PieceKind[] = ['T', 'I', 'S', 'L', 'O', 'Z', 'J', 'T'];
    const span = SCREEN_HEIGHT + 48;
    kinds.forEach((kind, i) => {
      const x = 4 + ((i * 37) % (SCREEN_WIDTH - 32));
      const speed = 0.012 + (i % 3) * 0.004;
      const y = Math.floor(((nowMs * speed + i * 61) % span) - 32);
      const rotation = (i % 4) as 0 | 1 | 2 | 3;
      for (const [cx, cy] of shapeOf(kind, rotation)) {
        const px = x + cx * CELL;
        const py = y + cy * CELL;
        this.ctx.fillStyle = TITLE_DEPTH;
        this.ctx.fillRect(px, py, CELL, CELL);
        this.ctx.fillStyle = BACKDROP;
        this.ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      }
    });
  }

  private menu(items: readonly string[], cursor: number, x: number, y: number, step: number): void {
    items.forEach((item, i) => {
      this.text(item, x, y + i * step, { color: INK });
      if (i === cursor) {
        this.cursor(x - 7, y + i * step + 1);
      }
    });
  }

  /** The menu cursor: a solid right-pointing triangle, three pixels by five, drawn rather than typed. */
  private cursor(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = INK;
    [1, 2, 3, 2, 1].forEach((width, row) => ctx.fillRect(x, y + row, width, 1));
  }

  /** A window: a one-pixel frame with its corner pixels left clear, over a cream fill. */
  private window(rect: Rect, fill = CREAM): void {
    const ctx = this.ctx;
    const { x, y, width, height } = rect;
    ctx.fillStyle = SHADOW;
    ctx.fillRect(x + 2, y + height, width - 2, 2);
    ctx.fillRect(x + width, y + 2, 2, height - 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 1, y + 1, width - 2, height - 2);
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + 1, y, width - 2, 1);
    ctx.fillRect(x + 1, y + height - 1, width - 2, 1);
    ctx.fillRect(x, y + 1, 1, height - 2);
    ctx.fillRect(x + width - 1, y + 1, 1, height - 2);
  }

  private heading(label: string, box: Rect): void {
    this.text(label, box.x + 6, box.y + 5, { color: RED });
  }

  private divider(box: Rect, y: number): void {
    this.ctx.fillStyle = CREAM_DIM;
    this.ctx.fillRect(box.x + 4, y, box.width - 8, 1);
  }

  /** Darkens everything drawn so far, for a window that sits over the game. */
  private shade(): void {
    this.ctx.fillStyle = 'rgba(11, 18, 32, 0.6)';
    this.ctx.fillRect(0, BAR_HEIGHT + 1, SCREEN_WIDTH, SCREEN_HEIGHT - BAR_HEIGHT * 2 - 2);
  }

  private text(text: string, x: number, y: number, style: TextStyle): void {
    this.font.draw(this.ctx, text, x, y, style);
  }
}

/** Whether something that has been up `ageMs` is in the dark half of its arrival blink. */
function isBlinkedOut(ageMs: number): boolean {
  return ageMs < ARRIVAL_BLINK_MS && Math.floor(ageMs / 60) % 2 === 1;
}

/** Scores with thin separators, as the handheld games print money. */
export function formatScore(score: number): string {
  return Math.floor(score)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** The title screen's help bar takes turns: the menu keys, then the game's. */
const TITLE_HINTS = [
  'ENTER SELECT   ARROWS CHOOSE   M SOUND',
  'LEFT RIGHT MOVE   DOWN SOFT DROP',
  'Z X UP TURN   SPACE HARD DROP',
  'C SHIFT HOLD   P ESC PAUSE',
] as const;
const TITLE_HINT_MS = 2600;

/** Minutes and seconds. */
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function helpFor(state: SceneState): string {
  switch (state.screen.kind) {
    case 'title':
      return TITLE_HINTS[Math.floor(state.nowMs / TITLE_HINT_MS) % TITLE_HINTS.length]!;
    case 'ready':
    case 'playing':
      return 'Z X TURN  C HOLD  SPACE DROP  P PAUSE';
    case 'paused':
      return 'ENTER SELECT   ESC RESUME';
    case 'toppingOut':
      return '';
    case 'nameEntry':
      return 'TYPE YOUR NAME   ENTER DONE';
    case 'results':
      return 'ARROWS CHOOSE   ENTER SELECT';
  }
}
