/** A random source in [0, 1), so tests and replays can supply a seeded one. */
export type Random = () => number;

/**
 * mulberry32: a small, fast, well-distributed 32-bit generator. Seeded games are
 * repeatable, which is what makes the rules testable end to end.
 */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
