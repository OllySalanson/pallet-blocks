import { describe, expect, it } from 'vitest';
import { DEFAULT_DAS_MS, Game } from '../core/game';
import {
  FreshKeys,
  HeldKeys,
  gameActionFor,
  isBrowserShortcut,
  isPauseKey,
  menuKeyFor,
  resultsKeyFor,
} from './keys';

describe('controls', () => {
  it('maps the documented keys', () => {
    expect(gameActionFor('ArrowLeft')).toBe('left');
    expect(gameActionFor('ArrowRight')).toBe('right');
    expect(gameActionFor('ArrowDown')).toBe('softDrop');
    expect(gameActionFor('ArrowUp')).toBe('rotateCW');
    expect(gameActionFor('KeyX')).toBe('rotateCW');
    expect(gameActionFor('KeyZ')).toBe('rotateCCW');
    expect(gameActionFor('Space')).toBe('hardDrop');
    expect(gameActionFor('KeyC')).toBe('hold');
    expect(gameActionFor('ShiftLeft')).toBe('hold');
    expect(isPauseKey('Escape')).toBe(true);
    expect(isPauseKey('KeyP')).toBe(true);
  });

  it('ignores keys it does not use', () => {
    expect(gameActionFor('KeyQ')).toBeNull();
    expect(menuKeyFor('KeyQ')).toBeNull();
  });

  it('confirms menus with Enter, Space or Z', () => {
    expect(['Enter', 'Space', 'KeyZ'].map(menuKeyFor)).toEqual(['confirm', 'confirm', 'confirm']);
  });

  it('keeps a game key pressed while Ctrl (turn anticlockwise) is still down', () => {
    const chord = (code: string) => ({ code, ctrlKey: true, metaKey: false, altKey: false });
    expect(isBrowserShortcut(chord('Space'), true)).toBe(false);
    expect(isBrowserShortcut(chord('ArrowLeft'), true)).toBe(false);
    expect(isBrowserShortcut(chord('ShiftLeft'), true)).toBe(false);
    expect(isBrowserShortcut(chord('ControlLeft'), true)).toBe(false);
  });

  it('leaves browser shortcuts to the browser', () => {
    const chord = (code: string, mods: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }) => ({
      code,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      ...mods,
    });
    expect(isBrowserShortcut(chord('KeyR', { ctrlKey: true }), true)).toBe(true);
    expect(isBrowserShortcut(chord('KeyW', { ctrlKey: true }), true)).toBe(true);
    expect(isBrowserShortcut(chord('ArrowLeft', { altKey: true }), true)).toBe(true);
    expect(isBrowserShortcut(chord('Space', { metaKey: true }), true)).toBe(true);
    // Outside play Ctrl is no game key, so Ctrl+anything is the browser's.
    expect(isBrowserShortcut(chord('ArrowDown', { ctrlKey: true }), false)).toBe(true);
    expect(isBrowserShortcut(chord('ArrowLeft', {}), true)).toBe(false);
  });
});

describe('keys held before play starts', () => {
  const pressHeld = (game: Game, held: HeldKeys) => held.actions().forEach((action) => game.press(action));

  it('moves a piece at GO when its key went down during READY, and keeps it sliding', () => {
    const game = new Game({ sequence: ['T'] });
    const held = new HeldKeys();
    held.press('ArrowLeft');
    const spawnX = game.piece!.x;
    pressHeld(game, held);
    expect(game.piece!.x).toBe(spawnX - 1);
    game.update(DEFAULT_DAS_MS + 200);
    expect(game.piece!.x).toBe(0);
  });

  it('lets the direction pressed last win when both are down', () => {
    const held = new HeldKeys();
    held.press('ArrowRight');
    held.press('ArrowLeft');
    held.press('ArrowDown');
    expect(held.actions()).toEqual(['right', 'left', 'softDrop']);
    held.press('ArrowRight');
    expect(held.actions()).toEqual(['left', 'softDrop', 'right']);
  });

  it('forgets keys let go of, and keys that act once on the press', () => {
    const held = new HeldKeys();
    ['ArrowLeft', 'Space', 'KeyZ', 'KeyC', 'ArrowUp', 'KeyQ'].forEach((code) => held.press(code));
    held.release('ArrowLeft');
    expect(held.actions()).toEqual([]);
    held.press('ArrowDown');
    held.clear();
    expect(held.actions()).toEqual([]);
  });
});

describe('keys held into a menu', () => {
  it('ignores the repeats of a soft drop held into the pause menu', () => {
    const fresh = new FreshKeys();
    fresh.press('ArrowDown', false);
    // P opens the pause menu: a new screen.
    fresh.clear();
    expect(fresh.counts('ArrowDown', true)).toBe(false);
    expect(fresh.counts('ArrowDown', true)).toBe(false);
  });

  it('lets a key pressed in the menu repeat, and counts a fresh press of a stale key', () => {
    const fresh = new FreshKeys();
    fresh.press('ArrowLeft', false);
    fresh.clear();
    fresh.press('ArrowDown', false);
    expect(fresh.counts('ArrowDown', true)).toBe(true);
    expect(fresh.counts('ArrowLeft', false)).toBe(true);
    fresh.press('ArrowLeft', true);
    expect(fresh.counts('ArrowLeft', true)).toBe(false);
  });

  it('stops counting the repeats of a key once it is let go of', () => {
    const fresh = new FreshKeys();
    fresh.press('ArrowRight', false);
    fresh.release('ArrowRight');
    expect(fresh.counts('ArrowRight', true)).toBe(false);
  });
});

describe('keys held into the name box', () => {
  it('does not type the repeats of a turn key held as the game ends', () => {
    const fresh = new FreshKeys();
    fresh.press('KeyX', false);
    // The stack tops out and the name box comes up: a new screen.
    fresh.clear();
    for (let i = 0; i < 10; i += 1) {
      fresh.press('KeyX', true);
      expect(fresh.counts('KeyX', true)).toBe(false);
    }
  });

  it('types a key pressed in the box, and goes on typing it while it is held', () => {
    const fresh = new FreshKeys();
    fresh.press('KeyX', false);
    fresh.clear();
    fresh.release('KeyX');
    expect(fresh.counts('KeyX', false)).toBe(true);
    fresh.press('KeyX', false);
    expect(fresh.counts('KeyX', true)).toBe(true);
  });
});

describe('keys on the results screen', () => {
  it('leaves the results only on keys that do nothing in play', () => {
    expect(['Enter', 'NumpadEnter'].map(resultsKeyFor)).toEqual(['confirm', 'confirm']);
    expect(['Escape', 'Backspace'].map(resultsKeyFor)).toEqual(['back', 'back']);
  });

  it('ignores the drop and turn keys a player is still hammering when the game ends', () => {
    expect(['Space', 'KeyZ', 'KeyX'].map(resultsKeyFor)).toEqual([null, null, null]);
  });

  it('still lets the arrows choose between PLAY AGAIN and TITLE', () => {
    expect(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map(resultsKeyFor)).toEqual([
      'left',
      'right',
      'up',
      'down',
    ]);
  });
});
