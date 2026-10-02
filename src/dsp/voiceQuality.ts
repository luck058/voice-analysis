/**
 * Voice quality measures: jitter, shimmer, and harmonics-to-noise ratio.
 *
 * Jitter is the cycle-to-cycle variation in period (frequency stability).
 * Shimmer is the cycle-to-cycle variation in amplitude.
 * Harmonics-to-noise ratio (HNR) measures how periodic the signal is.
 *
 * All measures follow Praat's definitions for local jitter and shimmer.
 */

import { SILENCE_DBFS, PITCH_MIN_HZ, PITCH_MAX_HZ } from '../config.js';
import { rmsDbfs } from './level.js';

/**
 * Voice quality measures.
 */
export interface VoiceQuality {
  /** Jitter as a percentage of the mean period. */
  jitterPercent: number;
  /** Shimmer as a percentage of the mean amplitude. */
  shimmerPercent: number;
  /** Harmonics-to-noise ratio in decibels. */
  hnrDb: number;
}

/**
 * Measure voice quality from audio samples given the fundamental frequency.
 *
 * @param samples Audio samples in [-1, 1].
 * @param sampleRate Samples per second.
 * @param f0Hz Fundamental frequency in Hz. Must be within [PITCH_MIN_HZ, PITCH_MAX_HZ].
 * @returns Voice quality measures, or null if the signal is too short, too quiet,
 *          or f0Hz is out of range.
 * @throws RangeError if sampleRate ≤ 0 or samples length is zero.
 */
export function measureVoiceQuality(
  samples: Float32Array,
  sampleRate: number,
  f0Hz: number
): VoiceQuality | null {
  throw new Error('not implemented');
}
