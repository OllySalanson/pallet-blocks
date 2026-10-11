/** One line of a high-score table. */
export interface ScoreEntry {
  readonly name: string;
  readonly score: number;
  readonly lines?: number;
  readonly level?: number;
}

export const TABLE_SIZE = 10;
export const NAME_MAX_LENGTH = 10;
export const STORAGE_KEY = 'pallet-blocks:high-scores:v1';

/** Highest score first; an older entry keeps its place over a new one with the same score. */
export function sortScores(entries: readonly ScoreEntry[]): ScoreEntry[] {
  return [...entries].sort((a, b) => b.score - a.score);
}

/** Whether a score would make the table. Zero never does. */
export function qualifies(entries: readonly ScoreEntry[], score: number, size = TABLE_SIZE): boolean {
  if (score <= 0) {
    return false;
  }
  return entries.length < size || score > sortScores(entries)[size - 1]!.score;
}

/** The table with a new entry in it, and where it landed (or -1 if it did not make it). */
export function insertScore(
  entries: readonly ScoreEntry[],
  entry: ScoreEntry,
  size = TABLE_SIZE,
): { table: ScoreEntry[]; rank: number } {
  if (!qualifies(entries, entry.score, size)) {
    return { table: sortScores(entries).slice(0, size), rank: -1 };
  }
  const sorted = sortScores(entries);
  let rank = sorted.findIndex((existing) => entry.score > existing.score);
  if (rank < 0) {
    rank = sorted.length;
  }
  sorted.splice(rank, 0, entry);
  return { table: sorted.slice(0, size), rank };
}

/**
 * A name as the game can draw it: capitals, digits and a little punctuation,
 * no more than ten characters, never blank.
 */
export function cleanName(raw: string, fallback = 'PLAYER'): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9 .!?'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX_LENGTH)
    .trim();
  return cleaned || fallback;
}

/** Whether a typed key may go into a name. */
export function isNameCharacter(key: string): boolean {
  return key.length === 1 && /^[A-Za-z0-9 .!?'-]$/.test(key);
}

/** Reads a stored table, tolerating anything a browser might hand back. */
export function parseScores(raw: string | null): ScoreEntry[] {
  if (!raw) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) {
      return [];
    }
    return sortScores(
      value
        .filter(
          (item): item is ScoreEntry =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as ScoreEntry).name === 'string' &&
            typeof (item as ScoreEntry).score === 'number' &&
            Number.isFinite((item as ScoreEntry).score),
        )
        .map((item) => ({
          name: cleanName(item.name),
          score: Math.max(0, Math.floor(item.score)),
          lines: typeof item.lines === 'number' ? item.lines : undefined,
          level: typeof item.level === 'number' ? item.level : undefined,
        })),
    ).slice(0, TABLE_SIZE);
  } catch {
    return [];
  }
}

/** A table kept in the browser. Storage that is missing or refuses is treated as empty. */
export class LocalScores {
  private readonly key: string;

  constructor(key: string = STORAGE_KEY) {
    this.key = key;
  }

  load(): ScoreEntry[] {
    try {
      return parseScores(window.localStorage.getItem(this.key));
    } catch {
      return [];
    }
  }

  save(entries: readonly ScoreEntry[]): void {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(entries));
    } catch {
      // Private windows and blocked storage: the table lasts this session only.
    }
  }
}
