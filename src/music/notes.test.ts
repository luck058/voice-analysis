import { hzToMidi, midiToHz, noteName, hzToNote, NoteInfo } from './notes.js';
import { A4_HZ } from '../config.js';

describe('music/notes', () => {
  describe('hzToMidi', () => {
    it('converts 440 Hz to MIDI 69 (A4)', () => {
      expect(hzToMidi(440)).toBeCloseTo(69);
    });

    it('converts 261.63 Hz to MIDI 60 (C4) within 0.1 cents of 0', () => {
      const midi = hzToMidi(261.63);
      const cents = 100 * (midi - 60);
      expect(cents).toBeCloseTo(0, 1);
    });

    it('uses custom A4 frequency', () => {
      expect(hzToMidi(442, 442)).toBeCloseTo(69);
    });

    it('throws RangeError for non-positive frequencies', () => {
      expect(() => hzToMidi(0)).toThrow(RangeError);
      expect(() => hzToMidi(-1)).toThrow(RangeError);
      expect(() => hzToMidi(NaN)).toThrow(RangeError);
      expect(() => hzToMidi(Infinity)).toThrow(RangeError);
      expect(() => hzToMidi(-Infinity)).toThrow(RangeError);
    });
  });

  describe('midiToHz', () => {
    it('converts MIDI 69 to 440 Hz (A4)', () => {
      expect(midiToHz(69)).toBeCloseTo(440);
    });

    it('converts MIDI 60 to 261.63 Hz (C4)', () => {
      expect(midiToHz(60)).toBeCloseTo(261.63, 1);
    });

    it('uses custom A4 frequency', () => {
      expect(midiToHz(69, 442)).toBeCloseTo(442);
    });

    it('round-trips with hzToMidi', () => {
      const originalHz = 440;
      const midi = hzToMidi(originalHz);
      const resultHz = midiToHz(midi);
      expect(resultHz).toBeCloseTo(originalHz);
    });
  });

  describe('noteName', () => {
    it('converts MIDI numbers to note names with sharps', () => {
      expect(noteName(60)).toBe('C');
      expect(noteName(61)).toBe('C#');
      expect(noteName(69)).toBe('A');
      expect(noteName(21)).toBe('A');
      expect(noteName(62)).toBe('D');
      expect(noteName(63)).toBe('D#');
      expect(noteName(64)).toBe('E');
      expect(noteName(65)).toBe('F');
      expect(noteName(66)).toBe('F#');
      expect(noteName(67)).toBe('G');
      expect(noteName(68)).toBe('G#');
    });
  });

  describe('hzToNote', () => {
    it('converts 440 Hz to A4 with 0 cents', () => {
      const result = hzToNote(440);
      const expected: NoteInfo = {
        midi: 69,
        name: 'A',
        octave: 4,
        cents: 0
      };
      expect(result).toEqual(expected);
    });

    it('converts 466.16 Hz to A#4', () => {
      const result = hzToNote(466.16);
      expect(result.name).toBe('A#');
      expect(result.octave).toBe(4);
    });

    it('converts 445 Hz to A4 +19.56 +/- 0.1 cents', () => {
      const result = hzToNote(445);
      expect(result.midi).toBe(69);
      expect(result.name).toBe('A');
      expect(result.octave).toBe(4);
      expect(result.cents).toBeCloseTo(19.56, 1);
    });

    it('converts 27.5 Hz to A0', () => {
      const result = hzToNote(27.5);
      expect(result.midi).toBe(21);
      expect(result.name).toBe('A');
      expect(result.octave).toBe(0);
      expect(result.cents).toBeCloseTo(0);
    });

    it('handles 50-cent boundary correctly', () => {
      // 50 cents above A4 (69) should be A#4 (70) at -50 cents
      const a4Plus50Cents = midiToHz(69.5); // This is exactly 50 cents above A4
      const result = hzToNote(a4Plus50Cents);
      expect(result.midi).toBe(70);
      expect(result.name).toBe('A#');
      expect(result.octave).toBe(4);
      expect(result.cents).toBeCloseTo(-50);
    });

    it('uses custom A4 frequency', () => {
      const result = hzToNote(442, 442);
      const expected: NoteInfo = {
        midi: 69,
        name: 'A',
        octave: 4,
        cents: 0
      };
      expect(result).toEqual(expected);
    });

    it('throws RangeError for non-positive frequencies', () => {
      expect(() => hzToNote(0)).toThrow(RangeError);
      expect(() => hzToNote(-1)).toThrow(RangeError);
      expect(() => hzToNote(NaN)).toThrow(RangeError);
      expect(() => hzToNote(Infinity)).toThrow(RangeError);
      expect(() => hzToNote(-Infinity)).toThrow(RangeError);
    });
  });
});