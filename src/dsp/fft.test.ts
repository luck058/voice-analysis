import { hannWindow, fft, magnitudeSpectrumDb, binFrequency } from './fft';
import { sine } from '../testing/synth';
import { FRAME_SIZE, DEFAULT_SAMPLE_RATE } from '../config';

describe('hannWindow', () => {
  it('matches the symmetric Hann formula for size 4', () => {
    const w = hannWindow(4);
    expect(w.length).toBe(4);
    expect(w[0]).toBeCloseTo(0);
    expect(w[1]).toBeCloseTo(0.75);
    expect(w[2]).toBeCloseTo(0.75);
    expect(w[3]).toBeCloseTo(0);
  });

  it('matches the symmetric Hann formula for size 5', () => {
    const w = hannWindow(5);
    expect(w.length).toBe(5);
    expect(w[0]).toBeCloseTo(0);
    expect(w[1]).toBeCloseTo(0.5);
    expect(w[2]).toBeCloseTo(1);
    expect(w[3]).toBeCloseTo(0.5);
    expect(w[4]).toBeCloseTo(0);
  });
});

describe('fft', () => {
  it('matches a hand-computed DFT of [1,2,3,4,0,0,0,0]', () => {
    const re = Float64Array.from([1, 2, 3, 4, 0, 0, 0, 0]);
    const im = new Float64Array(8);
    fft(re, im);
    // reference DFT
    const n = 8;
    const expRe = new Float64Array(n);
    const expIm = new Float64Array(n);
    const x = [1, 2, 3, 4, 0, 0, 0, 0];
    for (let k = 0; k < n; k++) {
      for (let t = 0; t < n; t++) {
      const ang = (-2 * Math.PI * k * t) / n;
      expRe[k] += x[t] * Math.cos(ang);
      expIm[k] += x[t] * Math.sin(ang);
      }
    }
    for (let k = 0; k < n; k++) {
      expect(re[k]).toBeCloseTo(expRe[k], 6);
      expect(im[k]).toBeCloseTo(expIm[k], 6);
    }
  });

  it('throws RangeError for a non-power-of-two length', () => {
    const re = new Float64Array(1000);
    const im = new Float64Array(1000);
    expect(() => fft(re, im)).toThrow(RangeError);
  });

  it('throws RangeError when lengths differ', () => {
    const re = new Float64Array(8);
    const im = new Float64Array(4);
    expect(() => fft(re, im)).toThrow(RangeError);
  });
});

describe('magnitudeSpectrumDb', () => {
  it('peaks at bin 100 with 0 +/- 0.5 dB for a unit-amplitude bin-centred sine', () => {
    const fs = DEFAULT_SAMPLE_RATE;
    const frame = sine(100 * fs / FRAME_SIZE, fs, FRAME_SIZE, 1);
    const spec = magnitudeSpectrumDb(frame);
    expect(spec.length).toBe(FRAME_SIZE / 2 + 1);
    let peakBin = 0;
    for (let i = 1; i < spec.length; i++) if (spec[i] > spec[peakBin]) peakBin = i;
    expect(peakBin).toBe(100);
    expect(Math.abs(spec[100] - 0)).toBeLessThan(0.5);
  });

  it('reads -6.02 +/- 0.5 dB for amplitude 0.5', () => {
    const fs = DEFAULT_SAMPLE_RATE;
    const frame = sine(100 * fs / FRAME_SIZE, fs, FRAME_SIZE, 0.5);
    const spec = magnitudeSpectrumDb(frame);
    expect(Math.abs(spec[100] - (-6.0206))).toBeLessThan(0.5);
  });

  it('floors silence at -120 dB in every bin', () => {
    const spec = magnitudeSpectrumDb(new Float32Array(FRAME_SIZE));
    for (let i = 0; i < spec.length; i++) {
      expect(spec[i]).toBeGreaterThanOrEqual(-120);
      expect(Number.isNaN(spec[i])).toBe(false);
    }
  });
});

describe('binFrequency', () => {
  it('computes bin * sampleRate / frameSize', () => {
    expect(binFrequency(100, 48000, 2048)).toBeCloseTo((100 * 48000) / 2048, 6);
    expect(binFrequency(0, 48000, 2048)).toBeCloseTo(0, 6);
  });
});
