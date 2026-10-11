import { describe, expect, it } from 'vitest';
import { gameActionFor, isPauseKey, menuKeyFor } from './keys';

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
});
