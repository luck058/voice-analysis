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
  throw new Error('not implemented');
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
  throw new Error('not implemented');
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
  throw new Error('not implemented');
}

/**
 * Determine which reference set to use based on median fundamental frequency.
 * @param medianF0Hz Median fundamental frequency (pitch) in Hz
 * @returns 'men' for medianF0Hz < 165 Hz, otherwise 'women'
 * @throws RangeError if medianF0Hz is not a positive finite number
 */
export function referenceSetFor(medianF0Hz: number): 'men' | 'women' {
  throw new Error('not implemented');
}
