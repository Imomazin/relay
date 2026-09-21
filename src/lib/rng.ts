/**
 * Deterministic pseudo-random number generator (mulberry32).
 *
 * The demonstrator seeds all synthetic data from a fixed integer so that every
 * `npm run db:seed` produces byte-for-byte identical output. This makes the
 * demo repeatable and the tests stable.
 */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof createRng>;

/** Integer in [min, max] inclusive. */
export function rngInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Uniformly pick one element. */
export function rngPick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Weighted pick. Weights need not sum to 1. */
export function rngWeighted<T>(rng: Rng, entries: readonly [T, number][]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [item, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return item;
  }
  return entries[entries.length - 1][0];
}

/** True with probability p. */
export function rngChance(rng: Rng, p: number): boolean {
  return rng() < p;
}

export const DEFAULT_SEED = Number(process.env.RELAY_SEED ?? 20240521);
