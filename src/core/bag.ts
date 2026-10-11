import { PIECE_KINDS, type PieceKind } from './pieces';
import type { Random } from './random';

/**
 * The 7-bag randomiser: every run of seven pieces is one of each, shuffled.
 * No piece can be missing for more than twelve pieces, and no piece can turn up
 * more than twice in a row.
 */
export class Bag {
  private readonly queue: PieceKind[] = [];
  private readonly random: Random;

  constructor(random: Random) {
    this.random = random;
  }

  /** The next piece, taken off the front of the queue. */
  next(): PieceKind {
    this.fill(1);
    return this.queue.shift()!;
  }

  /** The upcoming pieces, without taking them. */
  peek(count: number): readonly PieceKind[] {
    this.fill(count);
    return this.queue.slice(0, count);
  }

  private fill(count: number): void {
    while (this.queue.length < count) {
      this.queue.push(...shuffle(PIECE_KINDS, this.random));
    }
  }
}

/** Fisher-Yates, returning a new array. */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
