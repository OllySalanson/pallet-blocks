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
