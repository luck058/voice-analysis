import { hzToMidi, noteName } from '../music/notes.js';

export interface PitchPoint {
  timeSec: number;
  hz: number | null;
}

export interface SegmentPoint {
  x: number;
  y: number;
}

export interface GridLine {
  y: number;
  midi: number;
  label: string;
  isC: boolean;
}

export interface PitchTraceOptions {
  width: number;
  height: number;
  windowSec?: number;
  minMidi?: number;
  maxMidi?: number;
}

export class PitchTraceModel {
  private points: PitchPoint[] = [];
  private width: number;
  private height: number;
  private windowSec: number;
  private minMidi: number;
  private maxMidi: number;

  constructor(options: PitchTraceOptions) {
    if (options.width <= 0) throw new RangeError('width must be positive');
    if (options.height <= 0) throw new RangeError('height must be positive');
    
    this.width = options.width;
    this.height = options.height;
    this.windowSec = options.windowSec ?? 8;
    this.minMidi = options.minMidi ?? 40;
    this.maxMidi = options.maxMidi ?? 84;
    
    if (this.windowSec <= 0) throw new RangeError('windowSec must be positive');
    if (this.minMidi >= this.maxMidi) throw new RangeError('minMidi must be less than maxMidi');
  }

  add(timeSec: number, hz: number | null): void {
    throw new Error('not implemented');
  }

  xForTime(timeSec: number, nowSec: number): number {
    throw new Error('not implemented');
  }

  yForMidi(midi: number): number {
    throw new Error('not implemented');
  }

  segments(nowSec: number): SegmentPoint[][] {
    throw new Error('not implemented');
  }

  gridLines(): GridLine[] {
    throw new Error('not implemented');
  }
}
