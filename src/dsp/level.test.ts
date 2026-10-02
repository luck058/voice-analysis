import { rmsDbfs, peakDbfs } from './level';
import { sine, scaleToRms } from '../testing/synth';
import { DEFAULT_SAMPLE_RATE } from '../config';

describe('rmsDbfs', () => {
  it('reads -3.01 dB for a full-scale sine', () => {
    const frame = sine(220, DEFAULT_SAMPLE_RATE, 2048, 1);
    expect(Math.abs(rmsDbfs(frame) - (-3.0103))).toBeLessThan(0.05);
  });

  it('returns -120 for silence', () => {
    expect(rmsDbfs(new Float32Array(2048))).toBe(-120);
  });

  it('never goes below -120', () => {
    const tiny = new Float32Array(2048);
    tiny[0] = 1e-9;
    expect(rmsDbfs(tiny)).toBeGreaterThanOrEqual(-120);
  });
});

describe('peakDbfs', () => {
  it('reads 0 dB for a full-scale sine', () => {
    const frame = sine(220, DEFAULT_SAMPLE_RATE, 2048, 1);
    expect(Math.abs(peakDbfs(frame))).toBeLessThan(0.001);
  });

  it('returns -120 for silence', () => {
    expect(peakDbfs(new Float32Array(2048))).toBe(-120);
  });

  it('never goes below -120', () => {
    const tiny = new Float32Array(2048);
    tiny[0] = 1e-9;
    expect(peakDbfs(tiny)).toBeGreaterThanOrEqual(-120);
  });
});

describe('scaleToRms', () => {
  it('scales a signal to the requested RMS level', () => {
    const sig = sine(220, DEFAULT_SAMPLE_RATE, 2048, 0.5);
    const scaled = scaleToRms(sig, -20);
    expect(Math.abs(rmsDbfs(scaled) - (-20))).toBeLessThan(0.01);
  });

  it('returns a new array and does not modify the input', () => {
    const sig = sine(220, DEFAULT_SAMPLE_RATE, 2048, 0.5);
    const copy = Float32Array.from(sig);
    scaleToRms(sig, -10);
    expect(Array.from(sig)).toEqual(Array.from(copy));
  });
});
