import { describe, expect, it } from 'vitest';
import { Bag, shuffle } from './bag';
import { PIECE_KINDS } from './pieces';
import { seededRandom } from './random';

describe('7-bag', () => {
  it('deals each of the seven pieces exactly once in every bag', () => {
    const bag = new Bag(seededRandom(42));
    for (let round = 0; round < 50; round += 1) {
      const dealt = Array.from({ length: 7 }, () => bag.next());
      expect([...dealt].sort()).toEqual([...PIECE_KINDS].sort());
    }
  });

  it('never repeats a piece more than twice in a row', () => {
    const bag = new Bag(seededRandom(7));
    let run = 1;
    let previous = bag.next();
    for (let i = 0; i < 7000; i += 1) {
      const piece = bag.next();
      run = piece === previous ? run + 1 : 1;
      expect(run).toBeLessThanOrEqual(2);
      previous = piece;
    }
  });

  it('shows the same pieces in its preview as it then deals', () => {
    const bag = new Bag(seededRandom(3));
    bag.next();
    const preview = bag.peek(12);
    expect(Array.from({ length: 12 }, () => bag.next())).toEqual(preview);
  });

  it('is repeatable for a seed and differs between seeds', () => {
    const deal = (seed: number) => {
      const bag = new Bag(seededRandom(seed));
      return Array.from({ length: 28 }, () => bag.next()).join('');
    };
    expect(deal(1)).toBe(deal(1));
    expect(deal(1)).not.toBe(deal(2));
  });

  it('shuffles without losing or inventing items', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(items, seededRandom(9)).sort()).toEqual(items);
  });
});
