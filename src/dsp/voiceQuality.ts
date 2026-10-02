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
  if (sampleRate <= 0) {
    throw new RangeError('sampleRate must be > 0');
  }
  if (samples.length === 0) {
    throw new RangeError('samples must not be empty');
  }

  if (f0Hz < PITCH_MIN_HZ || f0Hz > PITCH_MAX_HZ) {
    return null;
  }

  if (rmsDbfs(samples) < SILENCE_DBFS) {
    return null;
  }

  const T0 = sampleRate / f0Hz;
  const len = samples.length;

  // Find cycle marks: peaks with parabolic interpolation
  const marks: number[] = [];
  const amps: number[] = [];

  // Find first peak within [0, T0 * 1.2]
  const firstEnd = Math.min(Math.ceil(T0 * 1.2), len - 2);
  let bestIdx = 0;
  let bestAbs = Math.abs(samples[0]);
  for (let i = 1; i <= firstEnd; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > bestAbs) {
      bestAbs = abs;
      bestIdx = i;
    }
  }

  // Parabolic interpolation for first mark
  {
    const y0 = Math.abs(samples[bestIdx - 1] ?? 0);
    const y1 = Math.abs(samples[bestIdx]);
    const y2 = Math.abs(samples[bestIdx + 1] ?? 0);
    const denom = 2 * (y0 - 2 * y1 + y2);
    if (Math.abs(denom) > 1e-12) {
      const offset = (y0 - y2) / denom;
      marks.push(bestIdx + offset);
      amps.push(y1 - ((y0 - y2) * offset) / 4);
    } else {
      marks.push(bestIdx);
      amps.push(y1);
    }
  }

  // Find subsequent marks
  while (true) {
    const prevMark = marks[marks.length - 1];
    const expectedNext = prevMark + T0;

    if (expectedNext >= len) {
      break;
    }

    const searchStart = Math.max(Math.ceil(expectedNext - 0.2 * T0), 0);
    const searchEnd = Math.min(Math.floor(expectedNext + 0.2 * T0), len - 2);

    if (searchStart >= searchEnd) {
      break;
    }

    let peakIdx = searchStart;
    let peakAbs = Math.abs(samples[searchStart]);
    for (let i = searchStart + 1; i <= searchEnd; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > peakAbs) {
        peakAbs = abs;
        peakIdx = i;
      }
    }

    // Parabolic interpolation
    const y0 = Math.abs(samples[peakIdx - 1]);
    const y1 = Math.abs(samples[peakIdx]);
    const y2 = Math.abs(samples[peakIdx + 1]);
    const denom = 2 * (y0 - 2 * y1 + y2);
    if (Math.abs(denom) > 1e-12) {
      const offset = (y0 - y2) / denom;
      marks.push(peakIdx + offset);
      amps.push(y1 - ((y0 - y2) * offset) / 4);
    } else {
      marks.push(peakIdx);
      amps.push(y1);
    }

    // Safety: prevent infinite loop
    if (marks.length > len) {
      break;
    }
  }

  // Need at least 10 complete cycles (11 marks)
  if (marks.length < 11) {
    return null;
  }

  // Compute periods (in samples) between consecutive marks
  const periods: number[] = [];
  for (let i = 0; i < marks.length - 1; i++) {
    periods.push(marks[i + 1] - marks[i]);
  }

  // Jitter: 100 * mean(|T_i - T_{i+1}|) / mean(T)
  const meanPeriod = periods.reduce((a, b) => a + b, 0) / periods.length;
  let absDiffSum = 0;
  for (let i = 0; i < periods.length - 1; i++) {
    absDiffSum += Math.abs(periods[i] - periods[i + 1]);
  }
  const jitterPercent = meanPeriod > 0
    ? (100 * absDiffSum / (periods.length - 1)) / meanPeriod
    : 0;

  // Shimmer: 100 * mean(|A_i - A_{i+1}|) / mean(A)
  const meanAmp = amps.reduce((a, b) => a + b, 0) / amps.length;
  let ampDiffSum = 0;
  for (let i = 0; i < amps.length - 1; i++) {
    ampDiffSum += Math.abs(amps[i] - amps[i + 1]);
  }
  const shimmerPercent = meanAmp > 0
    ? (100 * ampDiffSum / (amps.length - 1)) / meanAmp
    : 0;

  // HNR: normalized autocorrelation
  const periodRounded = Math.round(T0);
  const lagMin = Math.max(1, Math.round(periodRounded * 0.9));
  const lagMax = Math.min(Math.round(periodRounded * 1.1), len - 2);

  let maxR = 0;
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let num = 0;
    let den1 = 0;
    let den2 = 0;
    for (let i = 0; i < len - lag; i++) {
      num += samples[i] * samples[i + lag];
      den1 += samples[i] * samples[i];
      den2 += samples[i + lag] * samples[i + lag];
    }
    const denom = Math.sqrt(den1 * den2);
    const r = denom > 0 ? num / denom : 0;
    if (r > maxR) {
      maxR = r;
    }
  }

  const rClamped = Math.max(0.0001, Math.min(0.9999, maxR));
  const hnrDb = 10 * Math.log10(rClamped / (1 - rClamped));

  return { jitterPercent, shimmerPercent, hnrDb };
}
