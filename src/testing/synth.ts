// Deterministic signal generators for testing
// Every function returns a new Float32Array

export function sine(
  hz: number,
  sampleRate: number,
  length: number,
  amplitude: number = 0.5,
  phase: number = 0
): Float32Array {
  throw new Error('Not implemented');
}

export function harmonicTone(
  hz: number,
  sampleRate: number,
  length: number,
  harmonics: number = 10,
  amplitude: number = 0.5
): Float32Array {
  throw new Error('Not implemented');
}

export function vibratoTone(
  hz: number,
  rateHz: number,
  extentCents: number,
  sampleRate: number,
  length: number,
  amplitude: number = 0.5
): Float32Array {
  throw new Error('Not implemented');
}

export function whiteNoise(
  length: number,
  amplitude: number,
  seed: number
): Float32Array {
  throw new Error('Not implemented');
}

export function pulseTrain(
  periodsSec: number[],
  sampleRate: number,
  amplitudes?: number[]
): Float32Array {
  throw new Error('Not implemented');
}

export function resonate(
  signal: Float32Array,
  sampleRate: number,
  formants: { hz: number; bandwidthHz: number }[]
): Float32Array {
  throw new Error('Not implemented');
}

export function mix(a: Float32Array, b: Float32Array): Float32Array {
  throw new Error('Not implemented');
}

export function scaleToRms(
  signal: Float32Array,
  dbfs: number
): Float32Array {
  throw new Error('Not implemented');
}
