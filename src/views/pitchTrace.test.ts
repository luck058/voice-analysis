import { PitchTraceModel } from './pitchTrace.js';

// Mock hzToMidi and noteName since they are already implemented
jest.mock('../music/notes.js', () => ({
  hzToMidi: jest.fn((hz: number) => {
    // Mock conversion: assume A4 (440 Hz) is MIDI 69
    return 69 + 12 * Math.log2(hz / 440);
  }),
  noteName: jest.fn((midi: number) => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const note = notes[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${note}${octave}`;
  })
}));

const { hzToMidi } = jest.requireMock('../music/notes.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PitchTraceModel', () => {
  const options = { width: 800, height: 600 };
  let model: PitchTraceModel;

  beforeEach(() => {
    model = new PitchTraceModel(options);
  });

  describe('constructor', () => {
    it('should set default values', () => {
      expect(model).toBeDefined();
      // Cannot directly access private fields, but we can test behavior
    });

    it('should throw for non-positive width', () => {
      expect(() => new PitchTraceModel({ ...options, width: 0 })).toThrow('width must be positive');
    });

    it('should throw for non-positive height', () => {
      expect(() => new PitchTraceModel({ ...options, height: 0 })).toThrow('height must be positive');
    });

    it('should throw for non-positive windowSec', () => {
      expect(() => new PitchTraceModel({ ...options, windowSec: 0 })).toThrow('windowSec must be positive');
    });

    it('should throw for minMidi >= maxMidi', () => {
      expect(() => new PitchTraceModel({ ...options, minMidi: 60, maxMidi: 60 })).toThrow('minMidi must be less than maxMidi');
      expect(() => new PitchTraceModel({ ...options, minMidi: 61, maxMidi: 60 })).toThrow('minMidi must be less than maxMidi');
    });
  });

  describe('xForTime', () => {
    it('should map nowSec to width', () => {
      const nowSec = 10;
      const x = model.xForTime(nowSec, nowSec);
      expect(x).toBeCloseTo(options.width);
    });

    it('should map nowSec - windowSec to 0', () => {
      const nowSec = 10;
      const windowSec = 8;
      const x = model.xForTime(nowSec - windowSec, nowSec);
      expect(x).toBeCloseTo(0);
    });

    it('should map linearly between endpoints', () => {
      const nowSec = 10;
      const windowSec = 8;
      const midTime = nowSec - windowSec / 2;
      const x = model.xForTime(midTime, nowSec);
      expect(x).toBeCloseTo(options.width / 2);
    });
  });

  describe('yForMidi', () => {
    it('should map maxMidi to 0', () => {
      const y = model.yForMidi(84);
      expect(y).toBeCloseTo(0);
    });

    it('should map minMidi to height', () => {
      const y = model.yForMidi(40);
      expect(y).toBeCloseTo(options.height);
    });

    it('should map 440 Hz (MIDI 69) correctly', () => {
      const y = model.yForMidi(69);
      const expectedY = ((84 - 69) / (84 - 40)) * options.height;
      expect(y).toBeCloseTo(expectedY);
    });

    it('should clamp values above maxMidi', () => {
      const y = model.yForMidi(90);
      expect(y).toBeCloseTo(0);
    });

    it('should clamp values below minMidi', () => {
      const y = model.yForMidi(30);
      expect(y).toBeCloseTo(options.height);
    });
  });

  describe('add', () => {
    it('should add a point', () => {
      model.add(1, 440);
      // Cannot directly check points array, but we can test segments
    });

    it('should discard points older than windowSec', () => {
      const nowSec = 10;
      model.add(nowSec - 9, 440); // Should be discarded
      model.add(nowSec - 7, 440); // Should be kept
      const segments = model.segments(nowSec);
      expect(segments.length).toBe(1);
      expect(segments[0].length).toBe(1);
    });
  });

  describe('segments', () => {
    it('should return one segment for consecutive voiced points', () => {
      model.add(1, 440);
      model.add(1.01, 440);
      model.add(1.02, 440);
      const segments = model.segments(2);
      expect(segments.length).toBe(1);
      expect(segments[0].length).toBe(3);
    });

    it('should split segments on unvoiced points', () => {
      model.add(1, 440);
      model.add(1.01, null);
      model.add(1.02, 440);
      const segments = model.segments(2);
      expect(segments.length).toBe(2);
      expect(segments[0].length).toBe(1);
      expect(segments[1].length).toBe(1);
    });

    it('should split segments on gaps > 0.1 s', () => {
      model.add(1, 440);
      model.add(1.05, 440);
      model.add(1.2, 440); // 0.15 s gap from previous
      const segments = model.segments(2);
      expect(segments.length).toBe(2);
      expect(segments[0].length).toBe(2);
      expect(segments[1].length).toBe(1);
    });

    it('should keep single-point segments', () => {
      model.add(1, 440);
      const segments = model.segments(2);
      expect(segments.length).toBe(1);
      expect(segments[0].length).toBe(1);
    });
  });

  describe('gridLines', () => {
    it('should have maxMidi - minMidi + 1 entries', () => {
      const lines = model.gridLines();
      expect(lines.length).toBe(84 - 40 + 1);
    });

    it('should mark exactly the C notes', () => {
      const lines = model.gridLines();
      const cLines = lines.filter(line => line.isC);
      const expectedCCount = [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84].filter(midi => midi % 12 === 0).length;
      expect(cLines.length).toBe(expectedCCount);
      cLines.forEach(line => {
        expect(line.label.startsWith('C')).toBe(true);
      });
    });
  });
});
