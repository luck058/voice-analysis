import { SpectrogramModel } from './spectrogram';
import { magnitudeSpectrumDb } from '../dsp/fft';
import { FRAME_SIZE, DEFAULT_SAMPLE_RATE } from '../config';

function makeModel(overrides: Partial<ConstructorParameters<typeof SpectrogramModel>[0]> = {}): SpectrogramModel {
  return new SpectrogramModel({
    width: 32,
    height: 64,
    sampleRate: DEFAULT_SAMPLE_RATE,
    frameSize: FRAME_SIZE,
    ...overrides,
  });
}

function sineDbSpectrum(freqHz: number): Float32Array {
  const n = FRAME_SIZE;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = 0.5 * Math.sin((2 * Math.PI * freqHz * i) / DEFAULT_SAMPLE_RATE);
  }
  return magnitudeSpectrumDb(x);
}

describe('SpectrogramModel', () => {
  test('image has correct dimensions and starts opaque black', () => {
    const m = makeModel({ width: 7, height: 9 });
    expect(m.image.length).toBe(7 * 9 * 4);
    for (let i = 0; i < 7 * 9; i++) {
      expect(m.image[4 * i]).toBe(0);
      expect(m.image[4 * i + 1]).toBe(0);
      expect(m.image[4 * i + 2]).toBe(0);
      expect(m.image[4 * i + 3]).toBe(255);
    }
  });

  test('hzForRow(0) = maxHz and hzForRow(height-1) = minHz', () => {
    const m = makeModel();
    expect(m.hzForRow(0)).toBeCloseTo(8000);
    expect(m.hzForRow(63)).toBeCloseTo(50);
  });

  test('rowForHz(hzForRow(r)) = r for every row', () => {
    const m = makeModel();
    for (let r = 0; r < 64; r++) {
      expect(m.rowForHz(m.hzForRow(r))).toBe(r);
    }
  });

  test('colourFor at the dB limits returns the end stops', () => {
    const m = makeModel();
    expect(m.colourFor(-100)).toEqual([0, 0, 4]);
    expect(m.colourFor(-20)).toEqual([252, 253, 191]);
  });

  test('colourFor clamps below minDb', () => {
    const m = makeModel();
    expect(m.colourFor(-150)).toEqual([0, 0, 4]);
    expect(m.colourFor(-120)).toEqual([0, 0, 4]);
  });

  test('relative luminance increases across evenly spaced dB values', () => {
    const m = makeModel();
    const luminance = (c: [number, number, number]): number =>
      0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    let prev = -1;
    for (let i = 0; i <= 10; i++) {
      const db = -100 + (80 * i) / 10;
      const lum = luminance(m.colourFor(db));
      expect(lum).toBeGreaterThan(prev);
      prev = lum;
    }
  });

  test('push of a 1 kHz sine puts the brightest pixel near rowForHz(1000)', () => {
    const m = makeModel();
    m.push(sineDbSpectrum(1000));
    const w = 32;
    const h = 64;
    const x = w - 1;
    let bestRow = 0;
    let bestLum = -1;
    for (let r = 0; r < h; r++) {
      const idx = 4 * (r * w + x);
      const lum = 0.2126 * m.image[idx] + 0.7152 * m.image[idx + 1] + 0.0722 * m.image[idx + 2];
      if (lum > bestLum) {
        bestLum = lum;
        bestRow = r;
      }
    }
    expect(Math.abs(bestRow - m.rowForHz(1000))).toBeLessThanOrEqual(2);
  });

  test('after a second push the previous column has moved one pixel left', () => {
    const m = makeModel();
    const w = 32;
    const h = 64;
    m.push(sineDbSpectrum(1000));
    const x = w - 1;
    const before: number[] = [];
    for (let r = 0; r < h; r++) {
      const idx = 4 * (r * w + x);
      before.push(m.image[idx], m.image[idx + 1], m.image[idx + 2]);
    }
    m.push(sineDbSpectrum(1000));
    for (let r = 0; r < h; r++) {
      const idx = 4 * (r * w + (x - 1));
      expect(m.image[idx]).toBe(before[3 * r]);
      expect(m.image[idx + 1]).toBe(before[3 * r + 1]);
      expect(m.image[idx + 2]).toBe(before[3 * r + 2]);
    }
    // alpha still opaque everywhere
    for (let i = 0; i < w * h; i++) {
      expect(m.image[4 * i + 3]).toBe(255);
    }
  });
});
