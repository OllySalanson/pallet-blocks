import { Sfx, type SoundName } from '../audio/sfx';
import { VISIBLE_ROWS } from '../core/board';
import { Game, type GameEvent, type LockResult } from '../core/game';
import { seededRandom } from '../core/random';
import { loadGameFont, PixelFont } from '../render/pixelFont';
import {
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  SceneRenderer,
  type Callout,
  type DropTrail,
  type LockFlash,
  type ShownBanner,
} from '../render/scene';
import { LETTERBOX } from '../render/palette';
import { bannerForLevel, bannerForLock, describeLock, type Banner } from './callouts';
import { advance, frameDelta } from './clock';
import {
  LocalScores,
  NAME_MAX_LENGTH,
  STORAGE_KEY,
  cleanName,
  insertScore,
  isNameCharacter,
  qualifies,
  sortScores,
  type ScoreEntry,
} from './highScores';
import { gameActionFor, isBrowserShortcut, isMuteKey, isPauseKey, menuKeyFor, type MenuKey } from './keys';
import {
  CURTAIN_HOLD_MS,
  CURTAIN_ROW_MS,
  GO_MS,
  MAX_START_LEVEL,
  PAUSE_ITEMS,
  READY_MS,
  RESULT_ITEMS,
  moveCursor,
  stepLevel,
  type Screen,
  type TitleItem,
} from './screens';
import { fitScale } from './scale';

/** What a finished game reports to its host. */
export interface GameOverResult {
  readonly score: number;
  readonly lines: number;
  readonly level: number;
  /** The name the score was recorded under, or null if no name was asked for. */
  readonly name: string | null;
  /** Time spent playing, not counting pauses. */
  readonly durationMs: number;
}

export interface LeaderboardEntry {
  readonly name: string;
  readonly score: number;
}

export interface PalletBlocksOptions {
  /**
   * Who is playing. When set, scores are recorded under this name and nobody is
   * asked to type one; it is also shown in the title bar.
   */
  readonly playerName?: string;
  /** Called once at the end of every game, after any name entry. */
  readonly onGameOver?: (result: GameOverResult) => void | Promise<void>;
  /**
   * Called when the player chooses EXIT on the title screen (or presses Esc
   * there). Without it, the title screen has no EXIT.
   */
  readonly onExit?: () => void;
  /**
   * Supplies a shared leaderboard to show in place of this browser's own high
   * scores. Called on start, after each game's `onGameOver` settles, and on
   * returning to the title screen.
   */
  readonly loadLeaderboard?: () => Promise<readonly LeaderboardEntry[]>;
  /** The level the LEVEL option starts on, 1 to 15. */
  readonly startLevel?: number;
  /** Start with sound off. The player can still toggle it with M. */
  readonly muted?: boolean;
  /** localStorage key for this browser's high-score table. */
  readonly storageKey?: string;
  /** Take keyboard focus on mount. Defaults to true. */
  readonly autoFocus?: boolean;
  /**
   * Deal every game from this seed, so the same pieces come in the same order.
   * For practice, races and tests; leave unset for a fresh shuffle each game.
   */
  readonly seed?: number;
}

const MUTED_KEY = 'pallet-blocks:muted';
const LAST_NAME_KEY = 'pallet-blocks:last-name';
const SOFT_DROP_SOUND_GAP_MS = 45;
const AFTER_GAME_INPUT_GUARD_MS = 700;
/** The level-up jingle waits for a line-clear sound to finish. */
const LEVEL_UP_SOUND_DELAY_S = 0.32;

/**
 * The whole game, mounted into one element: a canvas, the keyboard, the loop,
 * the screens, the sound and the scores.
 */
export class PalletBlocksApp {
  private readonly root: HTMLElement;
  private readonly options: PalletBlocksOptions;
  private readonly display: HTMLCanvasElement;
  private readonly displayCtx: CanvasRenderingContext2D;
  private readonly buffer: HTMLCanvasElement;
  private readonly bufferCtx: CanvasRenderingContext2D;
  private readonly sfx: Sfx;
  private readonly localScores: LocalScores;
  private readonly resizeObserver: ResizeObserver | null;
  private renderer: SceneRenderer | null = null;

  private screen: Screen = { kind: 'title', cursor: 0 };
  /** Keys are ignored until this time, so a player still mashing drop at the end of a game does not skip what comes next. */
  private inputGuardUntil = 0;
  private game: Game | null = null;
  private startLevel: number;
  private nowMs = 0;
  private lastFrame: number | null = null;
  private frame = 0;
  private destroyed = false;

  private table: ScoreEntry[] = [];
  private leaderboard: ScoreEntry[] | null = null;
  private highlight = -1;
  private reported = false;
  private lastName = '';

  private callout: Callout | null = null;
  private banner: ShownBanner | null = null;
  /** Banners waiting for the one up now to finish. */
  private bannerQueue: Banner[] = [];
  private trail: DropTrail | null = null;
  private flash: LockFlash | null = null;
  /** Set by a hard drop, for the lock that follows it in the same batch of events. */
  private pendingDropDistance: number | null = null;
  private lastSoftDropSound = -Infinity;

  constructor(root: HTMLElement, options: PalletBlocksOptions = {}) {
    this.root = root;
    this.options = options;
    this.startLevel = stepLevel(Math.floor(options.startLevel ?? 1), 0);
    this.sfx = new Sfx(options.muted ?? readFlag(MUTED_KEY));
    this.localScores = new LocalScores(options.storageKey ?? STORAGE_KEY);
    this.table = this.localScores.load();
    this.lastName = readString(LAST_NAME_KEY) ?? '';

    root.classList.add('pallet-blocks');
    root.tabIndex = 0;
    root.setAttribute('role', 'application');
    root.setAttribute('aria-label', 'Pallet Blocks, a falling-blocks puzzle game');
    Object.assign(root.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      outline: 'none',
      background: LETTERBOX,
      userSelect: 'none',
      touchAction: 'none',
    } satisfies Partial<CSSStyleDeclaration>);

    this.display = document.createElement('canvas');
    this.display.style.display = 'block';
    this.display.style.imageRendering = 'pixelated';
    this.displayCtx = this.display.getContext('2d', { alpha: false })!;
    root.appendChild(this.display);

    this.buffer = document.createElement('canvas');
    this.buffer.width = SCREEN_WIDTH;
    this.buffer.height = SCREEN_HEIGHT;
    this.bufferCtx = this.buffer.getContext('2d')!;

    root.addEventListener('keydown', this.onKeyDown);
    root.addEventListener('keyup', this.onKeyUp);
    root.addEventListener('pointerdown', this.onPointerDown);
    root.addEventListener('focusout', this.onFocusOut);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.resize());
    this.resizeObserver?.observe(root);
    window.addEventListener('resize', this.onWindowResize);
    this.resize();

    if (options.autoFocus ?? true) {
      root.focus({ preventScroll: true });
    }

    void this.refreshLeaderboard();
    void loadGameFont().then(() => {
      if (this.destroyed) {
        return;
      }
      this.renderer = new SceneRenderer(this.bufferCtx, new PixelFont());
      this.frame = requestAnimationFrame(this.tick);
    });
  }

  // --- Public controls ---------------------------------------------------------

  pause(): void {
    if (this.isLive()) {
      this.game?.releaseAll();
      this.screen = { kind: 'paused', cursor: 0 };
      this.sfx.play('pause');
    }
  }

  resume(): void {
    if (this.screen.kind === 'paused') {
      this.screen = { kind: 'playing' };
      this.sfx.play('pause');
    }
  }

  restart(): void {
    this.startGame();
  }

  focus(): void {
    this.root.focus({ preventScroll: true });
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.root.removeEventListener('keydown', this.onKeyDown);
    this.root.removeEventListener('keyup', this.onKeyUp);
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    this.root.removeEventListener('focusout', this.onFocusOut);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('resize', this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.sfx.close();
    this.display.remove();
    this.root.classList.remove('pallet-blocks');
  }

  // --- The loop ----------------------------------------------------------------

  private readonly tick = (time: number): void => {
    if (this.destroyed) {
      return;
    }
    const dt = frameDelta(this.lastFrame, time);
    this.lastFrame = time;
    this.nowMs += dt;
    this.update(dt);
    this.render();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    if (this.isLive()) {
      this.updateBanner();
    }
    const screen = this.screen;
    if (screen.kind === 'ready') {
      const elapsedMs = screen.elapsedMs + dt;
      if (screen.elapsedMs < READY_MS && elapsedMs >= READY_MS) {
        this.sfx.play('go');
      }
      this.screen = elapsedMs >= READY_MS + GO_MS ? { kind: 'playing' } : { kind: 'ready', elapsedMs };
      if (elapsedMs >= READY_MS) {
        this.stepGame(dt);
      }
    } else if (screen.kind === 'playing') {
      this.stepGame(dt);
    } else if (screen.kind === 'toppingOut') {
      const elapsedMs = screen.elapsedMs + dt;
      this.screen = { kind: 'toppingOut', elapsedMs };
      if (elapsedMs >= VISIBLE_ROWS * CURTAIN_ROW_MS + CURTAIN_HOLD_MS) {
        this.finishGame();
      }
    }
  }

  private stepGame(dt: number): void {
    const game = this.game;
    if (!game) {
      return;
    }
    advance(game, dt);
    this.handleEvents(game.drainEvents());
  }

  private render(): void {
    const renderer = this.renderer;
    if (!renderer) {
      return;
    }
    renderer.draw({
      screen: this.screen,
      game: this.game,
      nowMs: this.nowMs,
      muted: this.sfx.muted,
      playerName: this.options.playerName ? cleanName(this.options.playerName) : null,
      titleItems: this.titleItems().map((item) => this.titleLabel(item)),
      best: this.table[0]?.score ?? 0,
      table: this.table,
      tableTitle: this.leaderboard ? 'LEADERBOARD' : 'HIGH SCORES',
      highlight: this.screen.kind === 'results' ? this.highlight : -1,
      callout: this.callout,
      banner: this.banner,
      trail: this.trail,
      flash: this.flash,
    });
    const ctx = this.displayCtx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.buffer, 0, 0, this.display.width, this.display.height);
  }

  // --- Game events -------------------------------------------------------------

  private handleEvents(events: readonly GameEvent[]): void {
    let levelUp = 0;
    for (const event of events) {
      switch (event.type) {
        case 'move':
          this.sfx.play('move');
          break;
        case 'rotate':
          this.sfx.play(event.spin === 'none' ? 'rotate' : 'spin');
          break;
        case 'hold':
          this.sfx.play('hold');
          break;
        case 'softDrop':
          if (this.nowMs - this.lastSoftDropSound > SOFT_DROP_SOUND_GAP_MS) {
            this.sfx.play('softDrop');
            this.lastSoftDropSound = this.nowMs;
          }
          break;
        case 'hardDrop':
          this.pendingDropDistance = event.distance;
          this.sfx.play('hardDrop');
          break;
        case 'lock':
          this.onLock(event);
          break;
        case 'levelUp':
          levelUp = event.level;
          break;
        case 'gameOver':
          this.screen = { kind: 'toppingOut', elapsedMs: 0 };
          this.sfx.play('gameOver');
          break;
        case 'spawn':
          break;
      }
    }
    if (levelUp) {
      this.showBanner(bannerForLevel(levelUp));
    }
  }

  /** Puts a banner up, or queues it behind the one already up. */
  private showBanner(banner: Banner): void {
    if (this.banner) {
      this.bannerQueue.push(banner);
    } else {
      // Up at once means alongside the line-clear sound: the jingle waits for it.
      this.raiseBanner(banner, LEVEL_UP_SOUND_DELAY_S);
    }
  }

  private updateBanner(): void {
    const banner = this.banner;
    if (banner && this.nowMs - banner.atMs >= banner.durationMs) {
      const next = this.bannerQueue.shift();
      this.banner = null;
      if (next) {
        this.raiseBanner(next, 0);
      }
    }
  }

  /** A level banner brings the jingle with it (and the renderer flashes the LEVEL row). */
  private raiseBanner(banner: Banner, soundDelaySeconds: number): void {
    this.banner = { ...banner, atMs: this.nowMs };
    if (banner.kind === 'level') {
      this.sfx.play('levelUp', soundDelaySeconds);
    }
  }

  private onLock(lock: LockResult): void {
    this.flash = { cells: lock.cells, atMs: this.nowMs };
    const distance = this.pendingDropDistance;
    this.pendingDropDistance = null;
    if (distance) {
      const tops = new Map<number, number>();
      for (const [x, y] of lock.cells) {
        tops.set(x, Math.min(y, tops.get(x) ?? Infinity));
      }
      this.trail = {
        kind: lock.kind,
        atMs: this.nowMs,
        columns: [...tops].map(([x, y]) => ({ x, fromY: y - distance, toY: y })),
      };
    }

    // A hard drop has already made its thud; a plain lock gets a click.
    const sound: SoundName | null = lock.perfectClear
      ? 'allClear'
      : lock.lines > 0
        ? (`clear${Math.min(lock.lines, 4)}` as SoundName)
        : distance === null
          ? 'lock'
          : null;
    if (sound) {
      this.sfx.play(sound);
    }
    if (lock.spin !== 'none' && lock.lines > 0) {
      this.sfx.play('spin');
    }

    const lines = describeLock(lock);
    if (lines.length > 0) {
      this.callout = { lines, points: lock.points, atMs: this.nowMs };
    }
    const banner = bannerForLock(lock);
    if (banner) {
      this.showBanner(banner);
    }
  }

  // --- Flow ----------------------------------------------------------------------

  private startGame(): void {
    const seed = this.options.seed;
    this.game = new Game({
      startLevel: this.startLevel,
      random: seed === undefined ? Math.random : seededRandom(seed),
    });
    this.game.drainEvents();
    this.screen = { kind: 'ready', elapsedMs: 0 };
    this.callout = null;
    this.banner = null;
    this.bannerQueue = [];
    this.trail = null;
    this.flash = null;
    this.highlight = -1;
    this.reported = false;
    this.sfx.play('ready');
  }

  private finishGame(): void {
    const game = this.game;
    if (!game) {
      return;
    }
    const given = this.options.playerName ? cleanName(this.options.playerName) : null;
    if (!given && qualifies(this.localScores.load(), game.score)) {
      this.screen = { kind: 'nameEntry', name: this.lastName };
      this.inputGuardUntil = this.nowMs + AFTER_GAME_INPUT_GUARD_MS;
      return;
    }
    this.record(given);
  }

  /** Saves the score under a name (if any), reports the game, and shows the results. */
  private record(name: string | null): void {
    const game = this.game;
    if (!game) {
      return;
    }
    let rank = -1;
    if (name) {
      const inserted = insertScore(this.localScores.load(), {
        name,
        score: game.score,
        lines: game.lines,
        level: game.level,
      });
      rank = inserted.rank;
      if (rank >= 0) {
        this.localScores.save(inserted.table);
      }
    }
    if (!this.leaderboard) {
      this.table = this.localScores.load();
      this.highlight = rank;
    }
    if (this.screen.kind !== 'nameEntry') {
      this.inputGuardUntil = this.nowMs + AFTER_GAME_INPUT_GUARD_MS;
    }
    this.screen = { kind: 'results', cursor: 0, rank };
    this.report({
      score: game.score,
      lines: game.lines,
      level: game.level,
      name,
      durationMs: Math.round(game.elapsedMs),
    });
  }

  private report(result: GameOverResult): void {
    if (this.reported) {
      return;
    }
    this.reported = true;
    let settled: Promise<void>;
    try {
      settled = Promise.resolve(this.options.onGameOver?.(result));
    } catch (error) {
      settled = Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
    void settled
      .catch((error: unknown) => console.error('pallet-blocks: onGameOver failed', error))
      .then(() => this.refreshLeaderboard(result));
  }

  private async refreshLeaderboard(mine?: GameOverResult): Promise<void> {
    const load = this.options.loadLeaderboard;
    if (!load) {
      return;
    }
    try {
      const entries = await load();
      if (this.destroyed) {
        return;
      }
      this.leaderboard = sortScores(
        entries
          .filter((entry) => typeof entry?.name === 'string' && Number.isFinite(entry?.score))
          .map((entry) => ({ name: cleanName(entry.name), score: Math.floor(entry.score) })),
      );
      this.table = this.leaderboard;
      if (mine && this.screen.kind === 'results') {
        const name = mine.name ? cleanName(mine.name) : null;
        this.highlight = this.table.findIndex((entry) => entry.score === mine.score && entry.name === name);
      }
    } catch (error) {
      console.error('pallet-blocks: loadLeaderboard failed', error);
    }
  }

  private toTitle(): void {
    this.screen = { kind: 'title', cursor: 0 };
    this.game = null;
    if (!this.leaderboard) {
      this.table = this.localScores.load();
    }
    void this.refreshLeaderboard();
  }

  private isLive(): boolean {
    return this.screen.kind === 'playing' || this.screen.kind === 'ready';
  }

  private acceptsGameInput(): boolean {
    return (
      this.screen.kind === 'playing' || (this.screen.kind === 'ready' && this.screen.elapsedMs >= READY_MS)
    );
  }

  // --- Menus -----------------------------------------------------------------------

  private titleItems(): TitleItem[] {
    return this.options.onExit ? ['play', 'level', 'sound', 'exit'] : ['play', 'level', 'sound'];
  }

  private titleLabel(item: TitleItem): string {
    switch (item) {
      case 'play':
        return 'PLAY';
      case 'level':
        return `LEVEL  < ${this.startLevel} >`;
      case 'sound':
        return `SOUND  ${this.sfx.muted ? 'OFF' : 'ON'}`;
      case 'exit':
        return 'EXIT';
    }
  }

  private titleKey(key: MenuKey, cursor: number): void {
    const items = this.titleItems();
    const item = items[cursor]!;
    if (key === 'up' || key === 'down') {
      this.screen = { kind: 'title', cursor: moveCursor(cursor, key === 'up' ? -1 : 1, items.length) };
      this.sfx.play('menuMove');
    } else if (key === 'left' || key === 'right') {
      if (item === 'level') {
        const next = stepLevel(this.startLevel, key === 'left' ? -1 : 1);
        if (next !== this.startLevel) {
          this.startLevel = next;
          this.sfx.play('menuMove');
        }
      } else if (item === 'sound') {
        this.toggleMute();
      }
    } else if (key === 'confirm') {
      if (item === 'play') {
        this.sfx.play('menuSelect');
        this.startGame();
      } else if (item === 'level') {
        this.startLevel = this.startLevel >= MAX_START_LEVEL ? 1 : this.startLevel + 1;
        this.sfx.play('menuMove');
      } else if (item === 'sound') {
        this.toggleMute();
      } else {
        this.options.onExit?.();
      }
    } else if (key === 'back') {
      this.options.onExit?.();
    }
  }

  private pausedKey(key: MenuKey, cursor: number): void {
    if (key === 'up' || key === 'down') {
      this.screen = { kind: 'paused', cursor: moveCursor(cursor, key === 'up' ? -1 : 1, PAUSE_ITEMS.length) };
      this.sfx.play('menuMove');
    } else if (key === 'confirm') {
      const item = PAUSE_ITEMS[cursor];
      this.sfx.play('menuSelect');
      if (item === 'RESUME') {
        this.screen = { kind: 'playing' };
      } else if (item === 'RESTART') {
        this.startGame();
      } else {
        this.toTitle();
      }
    } else if (key === 'back') {
      this.resume();
    }
  }

  private resultsKey(key: MenuKey, cursor: number, rank: number): void {
    if (key === 'left' || key === 'right' || key === 'up' || key === 'down') {
      const by = key === 'left' || key === 'up' ? -1 : 1;
      this.screen = { kind: 'results', cursor: moveCursor(cursor, by, RESULT_ITEMS.length), rank };
      this.sfx.play('menuMove');
    } else if (key === 'confirm') {
      this.sfx.play('menuSelect');
      if (RESULT_ITEMS[cursor] === 'PLAY AGAIN') {
        this.startGame();
      } else {
        this.toTitle();
      }
    } else if (key === 'back') {
      this.toTitle();
    }
  }

  private nameKey(event: KeyboardEvent, name: string): boolean {
    if (event.key === 'Enter') {
      const final = cleanName(name);
      this.lastName = final;
      writeString(LAST_NAME_KEY, final);
      this.sfx.play('menuSelect');
      this.record(final);
      return true;
    }
    if (event.key === 'Escape') {
      this.record(null);
      return true;
    }
    if (event.key === 'Backspace') {
      this.screen = { kind: 'nameEntry', name: name.slice(0, -1) };
      this.sfx.play('type');
      return true;
    }
    if (isNameCharacter(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (name.length < NAME_MAX_LENGTH && !(event.key === ' ' && name.length === 0)) {
        this.screen = { kind: 'nameEntry', name: name + event.key.toUpperCase() };
        this.sfx.play('type');
      }
      return true;
    }
    return false;
  }

  private toggleMute(): void {
    this.sfx.muted = !this.sfx.muted;
    writeString(MUTED_KEY, this.sfx.muted ? '1' : '0');
    this.sfx.play('menuSelect');
  }

  // --- Input -------------------------------------------------------------------------

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    // Keys pressed in the game are the game's: a host page never sees them.
    event.stopPropagation();
    if (isBrowserShortcut(event, this.isLive())) {
      return;
    }
    this.sfx.unlock();
    if (this.handleKeyDown(event)) {
      event.preventDefault();
    }
  };

  private handleKeyDown(event: KeyboardEvent): boolean {
    const screen = this.screen;
    const code = event.code;
    if (this.nowMs < this.inputGuardUntil) {
      return gameActionFor(code) !== null || menuKeyFor(code) !== null;
    }

    if (screen.kind === 'nameEntry') {
      return this.nameKey(event, screen.name);
    }
    if (isMuteKey(code)) {
      if (!event.repeat) {
        this.toggleMute();
      }
      return true;
    }

    if (this.isLive()) {
      if (isPauseKey(code)) {
        if (!event.repeat) {
          this.pause();
        }
        return true;
      }
      const action = gameActionFor(code);
      if (action) {
        if (!event.repeat && this.acceptsGameInput()) {
          this.game?.press(action);
          this.handleEvents(this.game?.drainEvents() ?? []);
        }
        return true;
      }
      return false;
    }

    const key = menuKeyFor(code) ?? (screen.kind === 'paused' && code === 'KeyP' ? 'back' : null);
    if (!key) {
      return false;
    }
    if (event.repeat && (key === 'confirm' || key === 'back')) {
      return true;
    }
    switch (screen.kind) {
      case 'title':
        this.titleKey(key, screen.cursor);
        break;
      case 'paused':
        this.pausedKey(key, screen.cursor);
        break;
      case 'results':
        // Only Enter chooses here: Space and Z are the keys a player is most
        // likely to still be hammering when the game ends.
        if (key !== 'confirm' || code === 'Enter' || code === 'NumpadEnter') {
          this.resultsKey(key, screen.cursor, screen.rank);
        }
        break;
      default:
        break;
    }
    return true;
  }

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    event.stopPropagation();
    const action = gameActionFor(event.code);
    if (action && this.game) {
      this.game.release(action);
    }
  };

  private readonly onPointerDown = (): void => {
    this.sfx.unlock();
    this.focus();
  };

  private readonly onFocusOut = (event: FocusEvent): void => {
    if (event.relatedTarget instanceof Node && this.root.contains(event.relatedTarget)) {
      return;
    }
    this.pause();
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.pause();
      this.lastFrame = null;
    }
  };

  // --- Sizing -------------------------------------------------------------------------

  private readonly onWindowResize = (): void => this.resize();

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    const scale = fitScale(width * dpr, height > 0 ? height * dpr : Infinity, SCREEN_WIDTH, SCREEN_HEIGHT);
    const deviceWidth = Math.round(SCREEN_WIDTH * scale);
    const deviceHeight = Math.round(SCREEN_HEIGHT * scale);
    if (this.display.width !== deviceWidth || this.display.height !== deviceHeight) {
      this.display.width = deviceWidth;
      this.display.height = deviceHeight;
    }
    this.display.style.width = `${deviceWidth / dpr}px`;
    this.display.style.height = `${deviceHeight / dpr}px`;
    this.render();
  }
}

function readFlag(key: string): boolean {
  return readString(key) === '1';
}

function readString(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeString(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage refused: the setting lasts this session only.
  }
}
