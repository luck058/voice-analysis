import { A4_HZ } from '../config.js';

export interface NoteInfo {
  midi: number;
  name: string;
  octave: number;
  cents: number;
}

export function hzToMidi(hz: number, a4: number = A4_HZ): number {
  throw new Error('not implemented');
}

export function midiToHz(midi: number, a4: number = A4_HZ): number {
  throw new Error('not implemented');
}

export function noteName(midi: number): string {
  throw new Error('not implemented');
}

export function hzToNote(hz: number, a4: number = A4_HZ): NoteInfo {
  throw new Error('not implemented');
}
