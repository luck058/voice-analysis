/**
 * Vowel chart utilities for visualizing formant frequencies (F1, F2) against
 * reference English vowels, as used in accent training.
 */

export interface ReferenceVowel {
  /** IPA symbol, e.g. "i", "æ" */
  symbol: string;
  /** Example word containing the vowel */
  example: string;
  /** First formant frequency in Hz */
  f1: number;
  /** Second formant frequency in Hz */
  f2: number;
}

/**
 * Reference vowel formants for men and women speakers.
 * Values from Peterson & Barney (1952) as cited in the todo details.
 */
export const REFERENCE_VOWELS: Record<'men' | 'women', ReferenceVowel[]> = {
  men: [
    { symbol: 'i', example: 'heed', f1: 270, f2: 2290 },
    { symbol: 'ɪ', example: 'hid', f1: 390, f2: 1990 },
    { symbol: 'ɛ', example: 'head', f1: 530, f2: 1840 },
    { symbol: 'æ', example: 'had', f1: 660, f2: 1720 },
    { symbol: 'ɑ', example: 'hod', f1: 730, f2: 1090 },
    { symbol: 'ɔ', example: 'hawed', f1: 570, f2: 840 },
    { symbol: 'ʊ', example: 'hood', f1: 440, f2: 1020 },
    { symbol: 'u', example: 'who\'d', f1: 300, f2: 870 },
    { symbol: 'ʌ', example: 'hud', f1: 640, f2: 1190 },
    { symbol: 'ɝ', example: 'heard', f1: 490, f2: 1350 },
  ],
  women: [
    { symbol: 'i', example: 'heed', f1: 310, f2: 2790 },
    { symbol: 'ɪ', example: 'hid', f1: 430, f2: 2480 },
    { symbol: 'ɛ', example: 'head', f1: 610, f2: 2330 },
    { symbol: 'æ', example: 'had', f1: 860, f2: 2050 },
    { symbol: 'ɑ', example: 'hod', f1: 850, f2: 1220 },
    { symbol: 'ɔ', example: 'hawed', f1: 590, f2: 920 },
    { symbol: 'ʊ', example: 'hood', f1: 470, f2: 1160 },
    { symbol: 'u', example: 'who\'d', f1: 370, f2: 950 },
    { symbol: 'ʌ', example: 'hud', f1: 760, f2: 1400 },
    { symbol: 'ɝ', example: 'heard', f1: 500, f2: 1640 },
  ],
};

/**
 * Convert frequency in Hz to Bark scale using Zwicker's formula.
 * @param hz Frequency in Hz
 * @returns Bark value
 * @throws RangeError if hz is not a positive finite number
 */
export function hzToBark(hz: number): number {
  if (typeof hz !== 'number' || !Number.isFinite(hz) || hz <= 0) {
    throw new RangeError('hz must be a positive finite number');
  }
  // Zwicker's formula for Bark scale conversion
  // 13 * atan(0.00076 * hz) + 3.5 * atan((hz / 7500) ** 2)
  return 13 * Math.atan(0.00076 * hz) + 3.5 * Math.atan(Math.pow(hz / 7500, 2));
}

/**
 * Compute chart coordinates for given formant frequencies.
 * The chart uses the conventional orientation: front vowels (high F2) on the LEFT,
 * open vowels (high F1) at the BOTTOM.
 *
 * @param f1 First formant frequency in Hz
 * @param f2 Second formant frequency in Hz
 * @param width Chart width in pixels
 * @param height Chart height in pixels
 * @returns { x, y } coordinates within [0, width] × [0, height]
 * @throws RangeError if f1 or f2 are not positive finite numbers, or if width/height are not positive
 */
export function chartPosition(
  f1: number,
  f2: number,
  width: number,
  height: number,
): { x: number; y: number } {
  // Validate inputs
  const isPositiveFinite = (n: number) => typeof n === 'number' && Number.isFinite(n) && n > 0;
  if (!isPositiveFinite(f1)) {
    throw new RangeError('f1 must be a positive finite number');
  }
  if (!isPositiveFinite(f2)) {
    throw new RangeError('f2 must be a positive finite number');
  }
  if (!isPositiveFinite(width)) {
    throw new RangeError('width must be a positive finite number');
  }
  if (!isPositiveFinite(height)) {
    throw new RangeError('height must be a positive finite number');
  }

  // Determine min/max formant values across all reference vowels
  const allVowels = [...REFERENCE_VOWELS.men, ...REFERENCE_VOWELS.women];
  const f1Values = allVowels.map(v => v.f1);
  const f2Values = allVowels.map(v => v.f2);
  const minF1 = Math.min(...f1Values);
  const maxF1 = Math.max(...f1Values);
  const minF2 = Math.min(...f2Values);
  const maxF2 = Math.max(...f2Values);

  // Normalized coordinates (x: front (high F2) -> left, y: open (high F1) -> bottom)
  const xNorm = (maxF2 - f2) / (maxF2 - minF2);
  const yNorm = (f1 - minF1) / (maxF1 - minF1);

  // Clamp to chart bounds and scale
  const x = Math.max(0, Math.min(width, xNorm * width));
  const y = Math.max(0, Math.min(height, yNorm * height));

  return { x, y };
}

/**
 * Find the nearest reference vowel to given formant frequencies.
 * Distance is Euclidean in Bark-transformed (f1, f2) space.
 *
 * @param f1 First formant frequency in Hz
 * @param f2 Second formant frequency in Hz
 * @param set Which reference set to use ('men' or 'women')
 * @returns { vowel, distanceBark } where vowel is the nearest reference vowel
 *          and distanceBark is the Euclidean distance in Bark space
 * @throws RangeError if f1 or f2 are not positive finite numbers
 */
export function nearestVowel(
  f1: number,
  f2: number,
  set: 'men' | 'women',
): { vowel: ReferenceVowel; distanceBark: number } {
  // Validate inputs
  const isPositiveFinite = (n: number) => typeof n === 'number' && Number.isFinite(n) && n > 0;
  if (!isPositiveFinite(f1)) {
    throw new RangeError('f1 must be a positive finite number');
  }
  if (!isPositiveFinite(f2)) {
    throw new RangeError('f2 must be a positive finite number');
  }
  if (set !== 'men' && set !== 'women') {
    throw new RangeError('set must be "men" or "women"');
  }

  const candidates = REFERENCE_VOWELS[set];
  // Compute Bark coordinates of the input point
  const bF1 = hzToBark(f1);
  const bF2 = hzToBark(f2);

  let nearest: ReferenceVowel | null = null;
  let minDist = Infinity;
  for (const vowel of candidates) {
    const vB1 = hzToBark(vowel.f1);
    const vB2 = hzToBark(vowel.f2);
    const dist = Math.hypot(bF1 - vB1, bF2 - vB2);
    if (dist < minDist) {
      minDist = dist;
      nearest = vowel;
    }
  }
  // At this point nearest must be non-null because candidates non-empty
  return { vowel: nearest as ReferenceVowel, distanceBark: minDist };
}

/**
 * Determine which reference set to use based on median fundamental frequency.
 * @param medianF0Hz Median fundamental frequency (pitch) in Hz
 * @returns 'men' for medianF0Hz < 165 Hz, otherwise 'women'
 * @throws RangeError if medianF0Hz is not a positive finite number
 */
export function referenceSetFor(medianF0Hz: number): 'men' | 'women' {
  if (typeof medianF0Hz !== 'number' || !Number.isFinite(medianF0Hz) || medianF0Hz <= 0) {
    throw new RangeError('medianF0Hz must be a positive finite number');
  }
  return medianF0Hz < 165 ? 'men' : 'women';
}
