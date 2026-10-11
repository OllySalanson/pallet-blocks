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
