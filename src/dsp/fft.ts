// FFT spectrum analysis

export function hannWindow(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (im.length !== n) {
    throw new RangeError('Real and imaginary arrays must have the same length');
  }
  if (!isPowerOfTwo(n)) {
    throw new RangeError(`FFT length must be a power of two, got ${n}`);
  }

  // bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
    let m = n >> 1;
    while (m > 0 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Cooley-Tukey radix-2
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const angle = (-2 * Math.PI) / size;
    for (let i = 0; i < n; i += size) {
      for (let k = 0; k < half; k++) {
        const cos = Math.cos(angle * k);
        const sin = Math.sin(angle * k);
        const idxA = i + k;
        const idxB = i + k + half;
        const tr = re[idxB] * cos - im[idxB] * sin;
        const ti = re[idxB] * sin + im[idxB] * cos;
        re[idxB] = re[idxA] - tr;
        im[idxB] = im[idxA] - ti;
        re[idxA] += tr;
        im[idxA] += ti;
      }
    }
  }
}

export function magnitudeSpectrumDb(frame: Float32Array): Float32Array {
  const n = frame.length;
  const windowed = new Float32Array(n);
  const hann = hannWindow(n);
  let hannSum = 0;
  for (let i = 0; i < n; i++) {
    hannSum += hann[i];
    windowed[i] = frame[i] * hann[i];
  }

  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    re[i] = windowed[i];
  }
  fft(re, im);

  // normalize so a unit-amplitude bin-centred sine reads 0 dB
  // Each real sinusoid contributes N/2 * coherent_gain at its bin.
  // coherent_gain of Hann = sum(window) / N, so reference = hannSum / 2
  const ref = hannSum / 2;
  const half = n / 2 + 1;
  const db = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    const normMag = mag / ref;
    if (normMag > 0) {
     db[i] =20 * Math.log10(normMag);
   } else {
      db[i] = -120;
    }
    if (db[i] < -120) {
      db[i] = -120;
    }
  }
  return db;
}

export function binFrequency(
  bin: number,
  sampleRate: number,
  frameSize: number
): number {
  return (bin * sampleRate) / frameSize;
}
