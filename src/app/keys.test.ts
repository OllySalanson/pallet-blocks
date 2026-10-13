import { describe, expect, it } from 'vitest';
import { gameActionFor, isBrowserShortcut, isPauseKey, menuKeyFor } from './keys';

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
