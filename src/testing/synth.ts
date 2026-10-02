// Deterministic signal generators for testing
// Every function returns a new Float32Array

export function sine(
  hz: number,
  sampleRate: number,
  length: number,
  amplitude: number = 0.5,
  phase: number = 0
): Float32Array {
  const out = new Float32Array(length);
  const omega = (2 * Math.PI * hz) / sampleRate;
  for (let i = 0; i < length; i++) {
    out[i] = amplitude * Math.sin(omega * i + phase);
  }
  return out;
}

export function harmonicTone(
  hz: number,
  sampleRate: number,
  length: number,
  harmonics: number = 10,
  amplitude: number = 0.5
): Float32Array {
  const out = new Float32Array(length);
  const nyquist = sampleRate / 2;
  for (let k = 1; k <= harmonics; k++) {
    const f = k * hz;
    if (f >= nyquist) break;
    const amp = amplitude / k; // sawtooth harmonic amplitudes
    const omega = (2 * Math.PI * f) / sampleRate;
    for (let i = 0; i < length; i++) {
      out[i] += amp * Math.sin(omega * i);
    }
  }
  // scale so peak equals the requested amplitude
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const abs = Math.abs(out[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 0) {
    const scale = amplitude / peak;
    for (let i = 0; i < length; i++) {
      out[i] *= scale;
    }
  }
  return out;
}

export function vibratoTone(
  hz: number,
  rateHz: number,
  extentCents: number,
  sampleRate: number,
  length: number,
  amplitude: number = 0.5
): Float32Array {
  const out = new Float32Array(length);
  let phase = 0;
  const omegaMod = 2 * Math.PI * rateHz;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const mod = extentCents * Math.sin(omegaMod * t);
    const ratio = Math.pow(2, mod / 1200);
    const instFreq = hz * ratio;
    phase += (2 * Math.PI * instFreq) / sampleRate;
    out[i] = amplitude * Math.sin(phase);
  }
  return out;
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function whiteNoise(
  length: number,
  amplitude: number,
  seed: number
): Float32Array {
  const out = new Float32Array(length);
  const rng = mulberry32(seed);
  for (let i = 0; i < length; i++) {
    // rng returns [0, 1), map to [-amplitude, amplitude]
    out[i] = amplitude * (2 * rng() - 1);
  }
  return out;
}

export function pulseTrain(
  periodsSec: number[],
  sampleRate: number,
  amplitudes?: number[]
): Float32Array {
  const totalLen = Math.round(
    periodsSec.reduce((a, b) => a + b, 0) * sampleRate
  );
  const out = new Float32Array(totalLen);
  const pulseDuration = 0.001; // 1 ms raised-cosine
  const pulseSamples = Math.round(pulseDuration * sampleRate);

  let startSample = 0;
  for (let p = 0; p < periodsSec.length; p++) {
    const amp = amplitudes ? amplitudes[p] : 1;
    for (let i = 0; i < pulseSamples; i++) {
      const idx = startSample + i;
      if (idx >= totalLen) break;
      const t = i / sampleRate;
      // raised cosine: 0.5 * (1 - cos(2*pi*t / pulseDuration))
      const env =
        0.5 * (1 - Math.cos((2 * Math.PI * t) / pulseDuration));
      out[idx] += amp * env;
    }
    startSample += Math.round(periodsSec[p] * sampleRate);
  }
  return out;
}

export function resonate(
  signal: Float32Array,
  sampleRate: number,
  formants: { hz: number; bandwidthHz: number }[]
): Float32Array {
  let y = new Float32Array(signal);
  for (const f of formants) {
    const R = Math.exp((-Math.PI * f.bandwidthHz) / sampleRate);
    const theta = (2 * Math.PI * f.hz) / sampleRate;
    const C = -R * R;
    const B = 2 * R * Math.cos(theta);
    const A = 1 - B - C;
    // y[n] = A*x[n] + B*y[n-1] + C*y[n-2]
    const next = new Float32Array(y.length);
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < y.length; i++) {
      const out = A * y[i] + B * y1 + C * y2;
      next[i] = out;
      y2 = y1;
      y1 = out;
    }
    y = next;
  }
  return y;
}

export function mix(a: Float32Array, b: Float32Array): Float32Array {
  const len = Math.max(a.length, b.length);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = (i < a.length ? a[i] : 0) + (i < b.length ? b[i] : 0);
  }
  return out;
}

export function scaleToRms(
  signal: Float32Array,
  dbfs: number
): Float32Array {
  const out = new Float32Array(signal);
  let sumSq = 0;
  for (let i = 0; i < out.length; i++) {
    sumSq += out[i] * out[i];
  }
  const rms = Math.sqrt(sumSq / out.length);
  const targetLinear = Math.pow(10, dbfs / 20);
  if (rms > 0) {
    const scale = targetLinear / rms;
    for (let i = 0; i < out.length; i++) {
      out[i] *= scale;
    }
  }
  return out;
}
