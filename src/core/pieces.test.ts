import { describe, expect, it } from 'vitest';
import { BOX_SIZE, PIECE_KINDS, SHAPES, kicksFor, rotateBy, shapeOf, type Rotation } from './pieces';

const picture = (cells: readonly (readonly [number, number])[], size: number): string[] =>
  Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => (cells.some(([cx, cy]) => cx === x && cy === y) ? '#' : '.')).join(
      '',
    ),
  );

describe('piece shapes', () => {
  it('has four cells in every state of every piece, inside its box', () => {
    for (const kind of PIECE_KINDS) {
      for (const rotation of [0, 1, 2, 3] as Rotation[]) {
        const cells = shapeOf(kind, rotation);
        expect(cells).toHaveLength(4);
        for (const [x, y] of cells) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(BOX_SIZE[kind]);
          expect(y).toBeLessThan(BOX_SIZE[kind]);
        }
      }
    }
  });

  it('turns the T about its centre', () => {
    expect(picture(SHAPES.T[0]!, 3)).toEqual(['.#.', '###', '...']);
    expect(picture(SHAPES.T[1]!, 3)).toEqual(['.#.', '.##', '.#.']);
    expect(picture(SHAPES.T[2]!, 3)).toEqual(['...', '###', '.#.']);
    expect(picture(SHAPES.T[3]!, 3)).toEqual(['.#.', '##.', '.#.']);
  });

  it('turns the I within its 4x4 box', () => {
    expect(picture(SHAPES.I[0]!, 4)).toEqual(['....', '####', '....', '....']);
    expect(picture(SHAPES.I[1]!, 4)).toEqual(['..#.', '..#.', '..#.', '..#.']);
    expect(picture(SHAPES.I[2]!, 4)).toEqual(['....', '....', '####', '....']);
    expect(picture(SHAPES.I[3]!, 4)).toEqual(['.#..', '.#..', '.#..', '.#..']);
  });

  it('keeps the O in place in every state', () => {
    for (const rotation of [1, 2, 3] as Rotation[]) {
      expect(SHAPES.O[rotation]).toEqual(SHAPES.O[0]);
    }
  });

  it('spawns J, L, S and Z flat side down', () => {
    expect(picture(SHAPES.J[0]!, 3)).toEqual(['#..', '###', '...']);
    expect(picture(SHAPES.L[0]!, 3)).toEqual(['..#', '###', '...']);
    expect(picture(SHAPES.S[0]!, 3)).toEqual(['.##', '##.', '...']);
    expect(picture(SHAPES.Z[0]!, 3)).toEqual(['##.', '.##', '...']);
  });
});

describe('rotation', () => {
  it('wraps around both ways', () => {
    expect(rotateBy(0, 1)).toBe(1);
    expect(rotateBy(3, 1)).toBe(0);
    expect(rotateBy(0, -1)).toBe(3);
    expect(rotateBy(2, -1)).toBe(1);
  });
});

describe('wall kicks', () => {
  it('tries five offsets for every turn of every piece but the O, starting in place', () => {
    for (const kind of PIECE_KINDS) {
      for (const from of [0, 1, 2, 3] as Rotation[]) {
        for (const to of [rotateBy(from, 1), rotateBy(from, -1)]) {
          const kicks = kicksFor(kind, from, to);
          expect(kicks[0]).toEqual([0, 0]);
          expect(kicks).toHaveLength(kind === 'O' ? 1 : 5);
        }
      }
    }
  });

  it('undoes a turn with the opposite kicks', () => {
    for (const kind of ['T', 'I'] as const) {
      for (const from of [0, 1, 2, 3] as Rotation[]) {
        const to = rotateBy(from, 1);
        const forward = kicksFor(kind, from, to);
        const back = kicksFor(kind, to, from);
        forward.forEach(([dx, dy], i) => {
          expect(back[i]).toEqual([-dx || 0, -dy || 0]);
        });
      }
    }
  });

  it('uses the y-down form of the standard tables', () => {
    // Spawn to right, J/L/S/T/Z: left, left and up, two down, left and two down.
    expect(kicksFor('T', 0, 1)).toEqual([
      [0, 0],
      [-1, 0],
      [-1, -1],
      [0, 2],
      [-1, 2],
    ]);
    expect(kicksFor('I', 0, 1)).toEqual([
      [0, 0],
      [-2, 0],
      [1, 0],
      [-2, 1],
      [1, -2],
    ]);
  });
});
