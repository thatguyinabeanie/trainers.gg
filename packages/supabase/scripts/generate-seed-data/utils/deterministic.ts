/**
 * Deterministic Utilities
 *
 * These utilities ensure that generated data is consistent across runs.
 * The same seed always produces the same output, enabling reliable testing.
 */

/**
 * Simple deterministic hash function (djb2 algorithm).
 * Returns a number between 0 and 1.
 *
 * @param input - The string to hash
 * @returns A number between 0 and 1
 */
export function hash(input: string): number {
  let hashValue = 5381;
  for (let i = 0; i < input.length; i++) {
    hashValue = (hashValue * 33) ^ input.charCodeAt(i);
  }
  // Convert to unsigned 32-bit and normalize to 0-1
  return ((hashValue >>> 0) % 2147483647) / 2147483647;
}

/**
 * Create a deterministic integer hash from a string.
 *
 * @param input - The string to hash
 * @param max - Maximum value (exclusive)
 * @returns An integer between 0 and max-1
 */
export function hashInt(input: string, max: number): number {
  return Math.floor(hash(input) * max);
}

/**
 * Create a seeded random number generator.
 * Always produces the same sequence for the same seed.
 *
 * @param seed - The seed string
 * @returns A function that returns random numbers between 0 and 1
 */
export function createSeededRandom(seed: string): () => number {
  // Use mulberry32 PRNG with seed derived from string
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (state + seed.charCodeAt(i)) | 0;
    state = (state + (state << 10)) | 0;
    state = state ^ (state >> 6);
  }
  state = (state + (state << 3)) | 0;
  state = state ^ (state >> 11);
  state = (state + (state << 15)) | 0;

  // Ensure state is positive and non-zero
  state = (Math.abs(state) || 1) >>> 0;

  return function random(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic shuffle using Fisher-Yates algorithm.
 * Same seed always produces same shuffle order.
 *
 * @param array - The array to shuffle
 * @param seed - The seed string for deterministic shuffling
 * @returns A new shuffled array (original is not modified)
 */
export function deterministicShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  const random = createSeededRandom(seed);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }

  return result;
}

/**
 * Generate a deterministic UUID v4-like string from namespace and index.
 * Same namespace + index always produces same UUID.
 *
 * Uses multiple rounds of hashing for better distribution.
 *
 * @param namespace - A namespace string to differentiate UUID sets
 * @param index - The index within the namespace
 * @returns A UUID v4-formatted string
 */
export function deterministicUUID(namespace: string, index: number): string {
  const input = `${namespace}-${index}`;

  // Generate 32 hex characters using multiple hash rounds
  const hexChars: string[] = [];
  for (let round = 0; round < 8; round++) {
    const roundHash = hash(`${input}-round${round}`);
    const hexValue = Math.floor(roundHash * 0xffff)
      .toString(16)
      .padStart(4, "0");
    hexChars.push(hexValue);
  }

  const hex = hexChars.join("");

  // Format as UUID v4
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    "4" + hex.substring(13, 16), // Version 4
    ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16) + hex.substring(17, 20), // Variant
    hex.substring(20, 32),
  ].join("-");
}

/**
 * Select an item from weighted options deterministically.
 *
 * @param options - Array of { value, weight } objects
 * @param seed - Seed for deterministic selection
 * @returns The selected value
 */
export function weightedSelect<T>(
  options: Array<{ value: T; weight: number }>,
  seed: string
): T {
  const random = hash(seed);
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let cumulative = 0;

  for (const option of options) {
    cumulative += option.weight / totalWeight;
    if (random < cumulative) {
      return option.value;
    }
  }

  // Fallback to last option
  return options[options.length - 1]!.value;
}

/**
 * Generate a deterministic date within a range.
 *
 * @param start - Start date
 * @param end - End date
 * @param seed - Seed for deterministic selection
 * @returns A date between start and end
 */
export function deterministicDate(start: Date, end: Date, seed: string): Date {
  const random = hash(seed);
  const startTime = start.getTime();
  const endTime = end.getTime();
  return new Date(startTime + random * (endTime - startTime));
}

/**
 * Pick N unique items from an array deterministically.
 *
 * @param array - The array to pick from
 * @param count - Number of items to pick
 * @param seed - Seed for deterministic selection
 * @returns Array of picked items
 */
export function deterministicPick<T>(
  array: T[],
  count: number,
  seed: string
): T[] {
  const shuffled = deterministicShuffle(array, seed);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Generate a deterministic number within a range.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param seed - Seed for deterministic selection
 * @returns An integer between min and max
 */
export function deterministicInt(
  min: number,
  max: number,
  seed: string
): number {
  const random = hash(seed);
  return Math.floor(random * (max - min + 1)) + min;
}
