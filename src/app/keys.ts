import type { GameAction } from '../core/game';

/**
 * Which physical key does what. Game keys go by `KeyboardEvent.code`, the
 * key's position, so Z and X sit under the left hand on any layout.
 */
const GAME_KEYS: Readonly<Record<string, GameAction>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'softDrop',
  ArrowUp: 'rotateCW',
  KeyX: 'rotateCW',
  KeyZ: 'rotateCCW',
  ControlLeft: 'rotateCCW',
  ControlRight: 'rotateCCW',
  Space: 'hardDrop',
  KeyC: 'hold',
  ShiftLeft: 'hold',
  ShiftRight: 'hold',
};

export function gameActionFor(code: string): GameAction | null {
  return GAME_KEYS[code] ?? null;
}

export type MenuKey = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back';

const MENU_KEYS: Readonly<Record<string, MenuKey>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  Space: 'confirm',
  KeyZ: 'confirm',
  Escape: 'back',
  KeyX: 'back',
  Backspace: 'back',
};

export function menuKeyFor(code: string): MenuKey | null {
  return MENU_KEYS[code] ?? null;
}

/**
 * The menu key a press stands for on the GAME OVER results. Only keys that
 * do nothing in play can choose or leave there: Space, Z and X are the drop
 * and turn keys a player is most likely to still be hammering when the game
 * ends, and one stray press would skip the results.
 */
export function resultsKeyFor(code: string): MenuKey | null {
  const key = menuKeyFor(code);
  if ((key === 'confirm' || key === 'back') && gameActionFor(code)) {
    return null;
  }
  return key;
}

export const isPauseKey = (code: string): boolean => code === 'Escape' || code === 'KeyP';
export const isMuteKey = (code: string): boolean => code === 'KeyM';

/** The modifier state of a key press. */
export interface KeyChord {
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

/**
 * Whether a key press belongs to the browser (Ctrl+R, Alt+Tab, ...) rather
 * than the game. During play Ctrl is itself a game key (turn anticlockwise),
 * so Ctrl still down when a game key goes down is a roll from one to the
 * other, and the game keeps it.
 */
export function isBrowserShortcut(chord: KeyChord, playing: boolean): boolean {
  if (chord.metaKey || chord.altKey) {
    return true;
  }
  if (!chord.ctrlKey || chord.code.startsWith('Control')) {
    return false;
  }
  return !(playing && gameActionFor(chord.code) !== null);
}

/** Actions that last as long as their key is down, rather than happening once on the press. */
const HELD_ACTIONS: ReadonlySet<GameAction> = new Set(['left', 'right', 'softDrop']);

/**
 * The move and soft-drop keys that are down right now, so a key held while
 * the game cannot take it (through READY, or a pause) still counts when play
 * starts. The browser sends no fresh press for a key that is already down.
 */
export class HeldKeys {
  private readonly down = new Map<string, GameAction>();

  press(code: string): void {
    const action = gameActionFor(code);
    if (action && HELD_ACTIONS.has(action)) {
      // Re-inserting keeps the map in press order, newest last.
      this.down.delete(code);
      this.down.set(code, action);
    }
  }

  release(code: string): void {
    this.down.delete(code);
  }

  /** Forgets every key, for when the keyups can no longer be heard. */
  clear(): void {
    this.down.clear();
  }

  /** The held actions, oldest press first, so pressing them in turn leaves the newest in charge. */
  actions(): GameAction[] {
    return [...new Set(this.down.values())];
  }
}

/**
 * The keys pressed since the screen last changed. A key already down when a
 * menu opens (the soft drop held into a pause, say) goes on sending
 * auto-repeat presses, and a menu must not let those run its cursor away, nor
 * the name box let a turn key held as the game ends type itself over and over.
 */
export class FreshKeys {
  private readonly down = new Set<string>();

  press(code: string, repeat: boolean): void {
    if (!repeat) {
      this.down.add(code);
    }
  }

  release(code: string): void {
    this.down.delete(code);
  }

  /** Forgets every key, for a new screen or when the keyups can no longer be heard. */
  clear(): void {
    this.down.clear();
  }

  /** Whether a press counts: a fresh one does, and so do the repeats of a key pressed on this screen. */
  counts(code: string, repeat: boolean): boolean {
    return !repeat || this.down.has(code);
  }
}
