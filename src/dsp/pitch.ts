import { PITCH_MIN_HZ, PITCH_MAX_HZ, SILENCE_DBFS } from '../config.js';
import { rmsDbfs } from './level.js';

export interface PitchResult {
  hz: number;
  clarity: number;
}

export function detectPitch(
  frame: Float32Array,
  sampleRate: number,
  options?: { minHz?: number; maxHz?: number; threshold?: number }
): PitchResult | null {
  const minHz = options?.minHz ?? PITCH_MIN_HZ;
  const maxHz = options?.maxHz ?? PITCH_MAX_HZ;
  const threshold = options?.threshold ?? 0.15;

  const tauMax = Math.floor(sampleRate / minHz);
  const tauMin = Math.max(1, Math.floor(sampleRate / maxHz));

  if (tauMin > tauMax) {
    return null;
  }

  if (frame.length < 2 * tauMax) {
    throw new RangeError(
      `frame length ${frame.length} is too short for sampleRate ${sampleRate} and minHz ${minHz}: need at least ${2 * tauMax} samples`
    );
  }

  if (rmsDbfs(frame) < SILENCE_DBFS) {
    return null;
  }

  const n = frame.length;

  // Difference function d(τ) = Σ (x[i] - x[i+τ])², τ = 1..tauMax+1
  const dLen = tauMax + 2; // one extra for walk and interpolation
  const d = new Float32Array(dLen);
  for (let tau = 1; tau < dLen; tau++) {
    let sum = 0;
    for (let i = 0; i < n - tau; i++) {
      const diff = frame[i] - frame[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // Cumulative mean normalized difference d'(τ)
  const dPrime = new Float32Array(dLen);
  dPrime[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < dLen; tau++) {
    runningSum += d[tau];
    dPrime[tau] = d[tau] / (runningSum / tau);
  }

  // Find first tau in [tauMin, tauMax] where d' < threshold
  let tau = tauMin;
  while (tau <= tauMax && dPrime[tau] >= threshold) {
    tau++;
  }

  if (tau > tauMax) {
    return null;
  }

  // Walk to the bottom of the dip
  while (tau + 1 < dLen && dPrime[tau + 1] < dPrime[tau]) {
    tau++;
  }

  // Parabolic interpolation using d'(tau-1), d'(tau), d'(tau+1)
  const prev = dPrime[tau - 1];
  const curr = dPrime[tau];
  const next = dPrime[tau + 1];
  const denom = prev - 2 * curr + next;
  const lag = denom !== 0 ? tau + (prev - next) / (2 * denom) : tau;

  const hz = sampleRate / lag;

  if (hz < minHz || hz > maxHz) {
    return null;
  }

  const clarity = Math.max(0, Math.min(1, 1 - curr));

  return { hz, clarity };
}
