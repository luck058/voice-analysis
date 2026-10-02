import {
  sine,
  harmonicTone,
  vibratoTone,
  whiteNoise,
  pulseTrain,
  resonate,
  mix,
} from './synth';
import { magnitudeSpectrumDb } from '../dsp/fft';
import { DEFAULT_SAMPLE_RATE, FRAME_SIZE } from '../config';

describe('sine', () => {
  it('generates the specified amplitude, phase and length', () => {
    const s = sine(100, DEFAULT_SAMPLE_RATE, 512, 0.25, Math.PI / 2);
    expect(s.length).toBe(512);
    expect(s[0]).toBeCloseTo(0.25, 6); // sin(pi/2) = 1
    expect(s[1]).toBeCloseTo(0.25 * Math.sin(2 * Math.PI * 100 / DEFAULT_SAMPLE_RATE + Math.PI / 2), 6);
  });
});

describe('whiteNoise', () => {
  it('is identical for the same seed', () => {
    const a = whiteNoise(1000, 0.5, 42);
    const b = whiteNoise(1000, 0.5, 42);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('differs for another seed', () => {
    const a = whiteNoise(1000, 0.5, 42);
    const b = whiteNoise(1000, 0.5, 43);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it('stays within [-amplitude, amplitude]', () => {
    const n = whiteNoise(5000, 0.7, 7);
    for (const v of n) {
      expect(Math.abs(v)).toBeLessThanOrEqual(0.7);
    }
  });
});

describe('harmonicTone', () => {
  it('has a peak equal to amplitude', () => {
    const t = harmonicTone(220, DEFAULT_SAMPLE_RATE, 48000, 10, 0.5);
    let peak = 0;
    for (const v of t) peak = Math.max(peak, Math.abs(v));
    expect(Math.abs(peak - 0.5)).toBeLessThan(0.01);
  });

  it('omits harmonics at or above Nyquist', () => {
    // 3000 Hz fundamental, 10 harmonics would exceed Nyquist at 8 kHz sample rate
    const t = harmonicTone(3000, 8000, 8000, 10, 0.5);
    expect(t.length).toBe(8000);
    // should not throw and should still be finite
    for (const v of t) expect(Number.isFinite(v)).toBe(true);
  });
});

describe('vibratoTone', () => {
  it('has a zero-crossing rate within 1% of hz over 1 s', () => {
    const fs = DEFAULT_SAMPLE_RATE;
    const t = vibratoTone(440, 5, 50, fs, fs, 0.5);
    let crossings = 0;
    for (let i = 1; i < t.length; i++) {
      if ((t[i - 1] <= 0 && t[i] > 0) || (t[i - 1] >= 0 && t[i] < 0)) crossings++;
    }
    const zcr = crossings / (t.length / fs); // crossings per second
    // each cycle has 2 zero crossings
    expect(Math.abs(zcr / 2 - 440) / 440).toBeLessThan(0.01);
  });
});

describe('pulseTrain', () => {
  it('has the right length and pulse peak positions', () => {
    const fs = DEFAULT_SAMPLE_RATE;
    const periods = [0.01, 0.02, 0.01];
    const amps = [1, 0.5, 0.25];
    const p = pulseTrain(periods, fs, amps);
    expect(p.length).toBe(Math.round(0.04 * fs));
    // pulse i starts at round(sum of previous periods * fs)
    const starts = [0, Math.round(0.01 * fs), Math.round(0.03 * fs)];
    for (let i = 0; i < 3; i++) {
      // peak of a 1 ms raised-cosine bump is at start + 0.5 ms
      const peakIdx = starts[i] + Math.round(0.0005 * fs);
      expect(Math.abs(p[peakIdx] - amps[i])).toBeLessThan(1e-3);
      // before the bump starts it is zero
      if (starts[i] > 0) expect(p[starts[i] - 1]).toBe(0);
    }
  });

  it('defaults amplitudes to 1', () => {
    const p = pulseTrain([0.01], DEFAULT_SAMPLE_RATE);
    const peakIdx = Math.round(0.0005 * DEFAULT_SAMPLE_RATE);
    expect(Math.abs(p[peakIdx] - 1)).toBeLessThan(1e-3);
  });
});

describe('resonate', () => {
  it('has a spectral local maximum within 3% of each formant frequency', () => {
    const fs = DEFAULT_SAMPLE_RATE;
    const formants = [
      { hz: 500, bandwidthHz: 80 },
      { hz: 1500, bandwidthHz: 100 },
      { hz: 2500, bandwidthHz: 120 },
    ];
    const impulse = new Float32Array(FRAME_SIZE);
    impulse[0] = 1;
    const y = resonate(impulse, fs, formants);
    const spec = magnitudeSpectrumDb(y);
    for (const f of formants) {
      const centerBin = Math.round((f.hz * FRAME_SIZE) / fs);
      // search a neighbourhood for the local max
      const radius = Math.round((0.1 * f.hz * FRAME_SIZE) / fs);
      let bestBin = centerBin;
      for (let b = Math.max(1, centerBin - radius); b <= Math.min(spec.length - 1, centerBin + radius); b++) {
        if (spec[b] > spec[bestBin]) bestBin = b;
      }
      const bestHz = (bestBin * fs) / FRAME_SIZE;
      expect(Math.abs(bestHz - f.hz) / f.hz).toBeLessThan(0.03);
    }
  });
});

describe('mix', () => {
  it('sums sample-wise with the length of the longer input', () => {
    const a = Float32Array.from([1, 2, 3]);
    const b = Float32Array.from([10, 20]);
    const m = mix(a, b);
    expect(m.length).toBe(3);
    expect(m[0]).toBeCloseTo(11);
    expect(m[1]).toBeCloseTo(22);
    expect(m[2]).toBeCloseTo(3);
  });
});
