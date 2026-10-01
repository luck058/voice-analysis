import { A4_HZ } from '../config.js';

export interface NoteInfo {
  midi: number;
  name: string;
  octave: number;
  cents: number;
}

export function hzToMidi(hz: number, a4: number = A4_HZ): number {
  // Validate input: must be a finite positive number
  if (!Number.isFinite(hz) || hz <= 0) {
    throw new RangeError('Frequency must be a finite positive number');
  }
  // Convert frequency to MIDI note number (fractional)
  return 69 + 12 * Math.log2(hz / a4);
}

export function midiToHz(midi: number, a4: number = A4_HZ): number {
  // Convert MIDI note number (including fractional) to frequency in Hz.
  // Formula: a4 * 2^((midi - 69) / 12)
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function noteName(midi: number): string {
  // Determine the note name (pitch class) for a given MIDI note number.
  // Use sharps only according to the specification.
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  // Ensure positive modulo for negative MIDI numbers (not expected but safe).
  const index = ((midi % 12) + 12) % 12;
  return NOTE_NAMES[index];
}

export function hzToNote(hz: number, a4: number = A4_HZ): NoteInfo {
  // Validate input: must be a finite positive number
  if (!Number.isFinite(hz) || hz <= 0) {
    throw new RangeError('Frequency must be a finite positive number');
  }
  // Convert frequency to fractional MIDI note number
  const midiFloat = hzToMidi(hz, a4);
  // Determine nearest integer MIDI note, rounding half away from zero (standard Math.round)
  const midi = Math.round(midiFloat);
  // Cents offset relative to the nearest note, in range [-50, 50)
  const cents = (midiFloat - midi) * 100;
  // Compute octave number (C-1 is MIDI 0)
  const octave = Math.floor(midi / 12) - 1;
  // Determine note name without octave, using sharps only
  const name = noteName(midi);
  return { midi, name, octave, cents };
}
