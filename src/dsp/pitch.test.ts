import { detectPitch, PitchResult } from './pitch.js';
import { PITCH_MIN_HZ, PITCH_MAX_HZ, SILENCE_DBFS } from '../config.js';

const SAMPLE_RATE = 48000;
const FRAME_SIZE = 2048;

function makeFrame(fill: (i: number) => number): Float32Array {
  const f = new Float32Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i++) f[i] = fill(i);
  return f;
}

function sineFrame(hz: number, amplitude: number): Float32Array {
  return makeFrame((i) => amplitude * Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE));
}

// Harmonic-rich tone: fundamental plus 7 harmonics with 1/k amplitudes.
function harmonicToneFrame(f0: number, amplitude: number): Float32Array {
  const harmonics = [1, 2, 3, 4, 5, 6, 7, 8];
  return makeFrame((i) => {
    let s = 0;
    for (const k of harmonics) {
      s += (amplitude / harmonics.length) * Math.sin((2 * Math.PI * k * f0 * i) / SAMPLE_RATE);
    }
    return s;
  });
}

// Deterministic seeded noise (xorshift32), no Math.random.
function noiseFrame(seed: number, amplitude: number): Float32Array {
  let x = seed | 0 || 1;
  return makeFrame(() => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return amplitude * ((x >>> 0) / 0xffffffff - 0.5) * 2;
  });
}

describe('detectPitch', () => {
  test('pure sines are detected within 0.5% with clarity above 0.9', () => {
    for (const hz of [70, 110, 220, 440, 880, 1000]) {
      const r = detectPitch(sineFrame(hz, 0.5), SAMPLE_RATE);
      expect(r).not.toBeNull();
      const result = r as PitchResult;
      expect(Math.abs(result.hz - hz) / hz).toBeLessThan(0.005);
      expect(result.clarity).toBeGreaterThan(0.9);
      expect(result.clarity).toBeLessThanOrEqual(1);
    }
  });

  test('harmonic tones are detected within 1% without octave errors', () => {
    for (const f0 of [100, 200, 400, 800]) {
      const r = detectPitch(harmonicToneFrame(f0, 0.5), SAMPLE_RATE);
      expect(r).not.toBeNull();
      const result = r as PitchResult;
      expect(Math.abs(result.hz - f0) / f0).toBeLessThan(0.01);
    }
  });

  test('all-zero frame returns null', () => {
    expect(detectPitch(new Float32Array(FRAME_SIZE), SAMPLE_RATE)).toBeNull();
  });

  test('a 220 Hz sine at -70 dBFS returns null', () => {
    const amp = 0.5 * Math.pow(10, SILENCE_DBFS / 20); // ~ -60 dBFS relative to 0.5
    const quiet = sineFrame(220, amp);
    // ensure it is genuinely below the silence floor
    let sumSq = 0;
    for (let i = 0; i < quiet.length; i++) sumSq += quiet[i] * quiet[i];
    const rms = Math.sqrt(sumSq / quiet.length);
    const dbfs = 20 * Math.log10(rms);
    expect(dbfs).toBeLessThan(SILENCE_DBFS);
    expect(detectPitch(quiet, SAMPLE_RATE)).toBeNull();
  });

  test('white noise returns null for at least 9 of 10 seeds', () => {
    let nulls = 0;
    for (let seed = 1; seed <= 10; seed++) {
      if (detectPitch(noiseFrame(seed, 0.5), SAMPLE_RATE) === null) nulls++;
    }
    expect(nulls).toBeGreaterThanOrEqual(9);
  });

  test('a 1000 Hz sine with maxHz = 500 never returns a value above 500', () => {
    const r = detectPitch(sineFrame(1000, 0.5), SAMPLE_RATE, { maxHz: 500 });
    if (r !== null) {
      expect(r.hz).toBeLessThanOrEqual(500);
    }
  });

  test('a frame shorter than 2 * sampleRate / minHz throws RangeError', () => {
    expect(() => detectPitch(sineFrame(220, 0.5).subarray(0, 1000), SAMPLE_RATE)).toThrow(RangeError);
  });

  test('50 calls on 2048-sample frames take under 2 seconds', () => {
    const frame = sineFrame(220, 0.5);
    const t0 = Date.now();
    for (let i = 0; i < 50; i++) {
      detectPitch(frame, SAMPLE_RATE);
    }
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(2000);
  });

  test('defaults match PITCH_MIN_HZ / PITCH_MAX_HZ bounds', () => {
    const r = detectPitch(sineFrame(440, 0.5), SAMPLE_RATE);
    expect(r).not.toBeNull();
    const result = r as PitchResult;
    expect(result.hz).toBeGreaterThanOrEqual(PITCH_MIN_HZ);
    expect(result.hz).toBeLessThanOrEqual(PITCH_MAX_HZ);
  });
});
