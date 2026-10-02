import { PITCH_MIN_HZ, PITCH_MAX_HZ, SILENCE_DBFS } from '../config.js';
import { rmsDbfs } from './level.js';

export interface PitchResult {
  hz: number;
  clarity: number;
}

export function detectPitch(
  frame: Float32Array,
  sampleRate: number,
  options?: { minHz?: number; maxHz?: number; threshold?: number }
): PitchResult | null {
  throw new Error('not implemented');
}
