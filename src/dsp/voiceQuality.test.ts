/**
 * Tests for measureVoiceQuality: jitter, shimmer and HNR.
 *
 * Signals are built inline (deterministic, no Math.random) so the tests do
 * not depend on any generator signature: each cycle is a single-sample
 * impulse of a given amplitude, which makes cycle peaks unambiguous.
 */
import { SILENCE_DBFS, PITCH_MIN_HZ, PITCH_MAX_HZ } from '../config.js';
import { measureVoiceQuality } from './voiceQuality.js';

const SR = 48000;

interface Cycle {
  periodSamples: number;
  amplitude: number;
}

/** Build an impulse train: one impulse of the given amplitude per cycle. */
function pulseTrain(cycles: Cycle[]): Float32Array {
  const total = cycles.reduce((n, c) => n + c.periodSamples, 0);
  const out = new Float32Array(total);
  let t = 0;
  for (const c of cycles) {
    out[t] = c.amplitude;
    t += c.periodSamples;
  }
  return out;
}

/** Deterministic white noise in [-1, 1] from a small LCG. */
function whiteNoise(length: number, seed: number): Float32Array {
  const out = new Float32Array(length);
  let s = seed >>> 0;
  for (let i = 0; i < length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out[i] = (s / 0x100000000) * 2 - 1;
  }
  return out;
}

function rms(x: Float32Array): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
}

/** Mix noise at the given level below the train's RMS (in dB). */
function mixNoise(train: Float32Array, dbBelow: number, seed: number): Float32Array {
  const noise = whiteNoise(train.length, seed);
  const targetRms = rms(train) * Math.pow(10, dbBelow / 20);
  const noiseRms = rms(noise);
  const gain = noiseRms > 0 ? targetRms / noiseRms : 0;
  const out = new Float32Array(train.length);
  for (let i = 0; i < train.length; i++) out[i] = train[i] + gain * noise[i];
  return out;
}

const F0 = 150;
const P = Math.round(SR / F0); // 320 samples

function constantTrain(n: number, amplitude = 1): Float32Array {
  return pulseTrain(Array.from({ length: n }, () => ({ periodSamples: P, amplitude })));
}

describe('measureVoiceQuality', () => {
  test('clean constant train: jitter < 0.5, shimmer < 0.5, hnr > 20', () => {
    const vq = measureVoiceQuality(constantTrain(60), SR, F0);
    expect(vq).not.toBeNull();
    if (vq === null) return;
    expect(vq.jitterPercent).toBeLessThan(0.5);
    expect(vq.shimmerPercent).toBeLessThan(0.5);
    expect(vq.hnrDb).toBeGreaterThan(20);
    expect(Number.isFinite(vq.jitterPercent)).toBe(true);
    expect(Number.isFinite(vq.shimmerPercent)).toBe(true);
    expect(Number.isFinite(vq.hnrDb)).toBe(true);
  });

  test('alternating periods (true jitter ~3.75%) gives jitter in [3, 5]', () => {
    const long = Math.round((1.02 * SR) / 150); // 326
    const short = Math.round((0.98 * SR) / 150); // 314
    const cycles: Cycle[] = [];
    for (let i = 0; i < 60; i++) {
      cycles.push({ periodSamples: i % 2 === 0 ? long : short, amplitude: 1 });
    }
    const vq = measureVoiceQuality(pulseTrain(cycles), SR, F0);
    expect(vq).not.toBeNull();
    if (vq === null) return;
    expect(vq.jitterPercent).toBeGreaterThanOrEqual(3);
    expect(vq.jitterPercent).toBeLessThanOrEqual(5);
  });

  test('alternating amplitudes (true shimmer 10%) gives shimmer in [8, 12]', () => {
    const cycles: Cycle[] = [];
    for (let i = 0; i < 60; i++) {
      cycles.push({ periodSamples: P, amplitude: i % 2 === 0 ? 1.05 : 0.95 });
    }
    const vq = measureVoiceQuality(pulseTrain(cycles), SR, F0);
    expect(vq).not.toBeNull();
    if (vq === null) return;
    expect(vq.shimmerPercent).toBeGreaterThanOrEqual(8);
    expect(vq.shimmerPercent).toBeLessThanOrEqual(12);
  });

  test('hnr decreases as noise increases: clean > 20 dB > 5 dB', () => {
    const clean = constantTrain(60);
    const at20 = mixNoise(clean, -20, 12345);
    const at5 = mixNoise(clean, -5, 12345);
    const vqClean = measureVoiceQuality(clean, SR, F0);
    const vq20 = measureVoiceQuality(at20, SR, F0);
    const vq5 = measureVoiceQuality(at5, SR, F0);
    expect(vqClean).not.toBeNull();
    expect(vq20).not.toBeNull();
    expect(vq5).not.toBeNull();
    if (!vqClean || !vq20 || !vq5) return;
    expect(vqClean.hnrDb).toBeGreaterThan(vq20.hnrDb);
    expect(vq20.hnrDb).toBeGreaterThan(vq5.hnrDb);
  });

  test('returns null for fewer than 10 cycles', () => {
    expect(measureVoiceQuality(constantTrain(5), SR, F0)).toBeNull();
  });

  test('returns null for silence (all zeros)', () => {
    expect(measureVoiceQuality(new Float32Array(SR), SR, F0)).toBeNull();
  });

  test('returns null when f0Hz is out of range', () => {
    expect(measureVoiceQuality(constantTrain(60), SR, 30)).toBeNull();
    expect(measureVoiceQuality(constantTrain(60), SR, PITCH_MIN_HZ - 1)).toBeNull();
    expect(measureVoiceQuality(constantTrain(60), SR, PITCH_MAX_HZ + 1)).toBeNull();
  });

  test('throws RangeError for invalid sampleRate or empty samples', () => {
    expect(() => measureVoiceQuality(constantTrain(60), 0, F0)).toThrow(RangeError);
    expect(() => measureVoiceQuality(new Float32Array(0), SR, F0)).toThrow(RangeError);
  });

  test('boundary f0 values within range are measured, not null', () => {
    // f0 exactly at the range bounds is in range; use a matching train.
    const lowF0 = PITCH_MIN_HZ;
    const pLow = Math.round(SR / lowF0);
    const trainLow = pulseTrain(
      Array.from({ length: 12 }, () => ({ periodSamples: pLow, amplitude: 1 }))
    );
    const vq = measureVoiceQuality(trainLow, SR, lowF0);
    expect(vq).not.toBeNull();
  });
});
