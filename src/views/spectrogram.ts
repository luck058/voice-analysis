const COLOUR_STOPS: [number, [number, number, number]][] = [
  [0, [0, 0, 4]],
  [0.25, [81, 18, 124]],
  [0.5, [183, 55, 121]],
  [0.75, [252, 137, 97]],
  [1, [252, 253, 191]],
];

/**
 * Scrolling spectrogram image model with a log frequency axis.
 * Converts a dB magnitude spectrum to a coloured column in a time-frequency image.
 */
export class SpectrogramModel {
  public readonly image: Uint8ClampedArray;
  private readonly width: number;
  private readonly height: number;
  private readonly sampleRate: number;
  private readonly frameSize: number;
  private readonly minHz: number;
  private readonly maxHz: number;
  private readonly minDb: number;
  private readonly maxDb: number;
  private readonly binWidth: number;

  constructor(options: {
    width: number;
    height: number;
    sampleRate: number;
    frameSize: number;
    minHz?: number;
    maxHz?: number;
    minDb?: number;
    maxDb?: number;
  }) {
    const {
      width,
      height,
      sampleRate,
      frameSize,
      minHz = 50,
      maxHz = 8000,
      minDb = -100,
      maxDb = -20,
    } = options;

    if (width <= 0) throw new RangeError('width must be positive');
    if (height <= 0) throw new RangeError('height must be positive');
    if (sampleRate <= 0) throw new RangeError('sampleRate must be positive');
    if (frameSize <= 0) throw new RangeError('frameSize must be positive');
    if (minHz <= 0) throw new RangeError('minHz must be positive');
    if (maxHz <= minHz) throw new RangeError('maxHz must be greater than minHz');
    if (maxDb <= minDb) throw new RangeError('maxDb must be greater than minDb');

    this.width = width;
    this.height = height;
    this.sampleRate = sampleRate;
    this.frameSize = frameSize;
    this.minHz = minHz;
    this.maxHz = maxHz;
    this.minDb = minDb;
    this.maxDb = maxDb;
    this.binWidth = sampleRate / frameSize;

    const size = width * height * 4;
    const img = new Uint8ClampedArray(size);
    for (let i = 0; i < size; i += 4) {
      img[i] = 0;
      img[i + 1] = 0;
      img[i + 2] = 0;
      img[i + 3] = 255;
    }
    this.image = img;
  }

  hzForRow(row: number): number {
    const t = row / (this.height - 1);
    return this.maxHz * Math.pow(this.minHz / this.maxHz, t);
  }

  rowForHz(hz: number): number {
    const t = Math.log(hz / this.maxHz) / Math.log(this.minHz / this.maxHz);
    const r = Math.round(t * (this.height - 1));
    return Math.max(0, Math.min(this.height - 1, r));
  }

  colourFor(db: number): [number, number, number] {
    const clamped = Math.max(this.minDb, Math.min(this.maxDb, db));
    const t = (clamped - this.minDb) / (this.maxDb - this.minDb);

    for (let i = 0; i < COLOUR_STOPS.length - 1; i++) {
      const [t0, c0] = COLOUR_STOPS[i];
      const [t1, c1] = COLOUR_STOPS[i + 1];
      if (t >= t0 && t <= t1) {
        const f = (t - t0) / (t1 - t0);
        return [
          Math.round(c0[0] + f * (c1[0] - c0[0])),
          Math.round(c0[1] + f * (c1[1] - c0[1])),
          Math.round(c0[2] + f * (c1[2] - c0[2])),
        ];
      }
    }

    return [252, 253, 191];
  }

  push(spectrumDb: Float32Array): void {
    const w = this.width;
    const h = this.height;
    const img = this.image;
    const bw = this.binWidth;
    const specLen = spectrumDb.length;

    // Shift every row left by one pixel
    for (let r = 0; r < h; r++) {
      img.copyWithin(r * w * 4, r * w * 4 + 4, (r + 1) * w * 4);
    }

    // Draw new column at x = width - 1
    const x = w - 1;
    for (let r = 0; r < h; r++) {
      const hz = this.hzForRow(r);
      const bin = hz / bw;
      const lo = Math.floor(bin);
      const hi = Math.ceil(bin);
      const frac = bin - lo;

      let db: number;
      if (hi <= 0) {
        db = spectrumDb[0];
      } else if (lo >= specLen - 1) {
        db = spectrumDb[specLen - 1];
      } else {
        const safeLo = Math.max(0, lo);
        const safeHi = Math.min(specLen - 1, hi);
        db = spectrumDb[safeLo] + frac * (spectrumDb[safeHi] - spectrumDb[safeLo]);
      }

      const [cr, cg, cb] = this.colourFor(db);
      const idx = (r * w + x) * 4;
      img[idx] = cr;
      img[idx + 1] = cg;
      img[idx + 2] = cb;
      img[idx + 3] = 255;
    }
  }
}
