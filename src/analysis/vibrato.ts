export interface PitchPoint {
  timeSec: number;
  cents: number;
}

export interface Vibrato {
  rateHz: number;
  extentCents: number;
}

export interface VibratoOptions {
  minRateHz?: number;
  maxRateHz?: number;
  minExtentCents?: number;
}

/**
 * Detect vibrato rate and extent from a pitch track.
 *
 * @param track - Array of pitch points in time order (may be irregularly spaced)
 * @param options - Detection thresholds (defaults: minRateHz=3, maxRateHz=9, minExtentCents=10)
 * @returns Vibrato object with rateHz and extentCents, or null if no vibrato detected
 * @throws RangeError if track is empty or options contain invalid values
 */
export function detectVibrato(
  track: PitchPoint[],
  options?: VibratoOptions
): Vibrato | null {
  throw new Error('not implemented');
}
