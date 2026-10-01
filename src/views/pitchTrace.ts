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
    // Validate inputs
    if (typeof timeSec !== 'number' || !Number.isFinite(timeSec)) {
      throw new RangeError('timeSec must be a finite number');
    }
    if (hz !== null && (typeof hz !== 'number' || !Number.isFinite(hz) || hz <= 0)) {
      throw new RangeError('hz must be null or a positive finite number');
    }
    // Record the point
    this.points.push({ timeSec, hz });
    // Discard points older than the window relative to the newest point
    const cutoff = this.points[this.points.length - 1].timeSec - this.windowSec;
    this.points = this.points.filter(p => p.timeSec >= cutoff);
  }

  xForTime(timeSec: number, nowSec: number): number {
    if (typeof timeSec !== 'number' || !Number.isFinite(timeSec)) {
      throw new RangeError('timeSec must be a finite number');
    }
    if (typeof nowSec !== 'number' || !Number.isFinite(nowSec)) {
      throw new RangeError('nowSec must be a finite number');
    }
    // Linear mapping: nowSec -> width, nowSec - windowSec -> 0
    const elapsed = nowSec - timeSec;
    const proportion = elapsed / this.windowSec;
    let x = this.width * (1 - proportion);
    // Clamp to canvas bounds
    if (x < 0) x = 0;
    if (x > this.width) x = this.width;
    return x;
  }

  yForMidi(midi: number): number {
    if (typeof midi !== 'number' || !Number.isFinite(midi)) {
      throw new RangeError('midi must be a finite number');
    }
    // Clamp midi to range
    if (midi >= this.maxMidi) return 0;
    if (midi <= this.minMidi) return this.height;
    const ratio = (this.maxMidi - midi) / (this.maxMidi - this.minMidi);
    return ratio * this.height;
  }

  segments(nowSec: number): SegmentPoint[][] {
    if (typeof nowSec !== 'number' || !Number.isFinite(nowSec)) {
      throw new RangeError('nowSec must be a finite number');
    }
    const startTime = nowSec - this.windowSec;
    // Include only points within the visible window and not in the future
    const pts = this.points
      .filter(p => p.timeSec >= startTime && p.timeSec <= nowSec)
      .sort((a, b) => a.timeSec - b.timeSec);

    const result: SegmentPoint[][] = [];
    let current: SegmentPoint[] = [];
    let prev: PitchPoint | undefined;

    for (const p of pts) {
      if (p.hz === null) {
        // Unvoiced point breaks the segment
        if (current.length) {
          result.push(current);
          current = [];
        }
        prev = undefined;
        continue;
      }
      // Check gap from previous voiced point
      if (prev && prev.hz !== null) {
        const gap = p.timeSec - prev.timeSec;
        if (gap > 0.1) {
          if (current.length) {
            result.push(current);
          }
          current = [];
        }
      }
      const x = this.xForTime(p.timeSec, nowSec);
      const midi = hzToMidi(p.hz);
      const y = this.yForMidi(midi);
      current.push({ x, y });
      prev = p;
    }
    if (current.length) {
      result.push(current);
    }
    return result;
  }

  gridLines(): GridLine[] {
    const lines: GridLine[] = [];
    for (let midi = this.minMidi; midi <= this.maxMidi; midi++) {
      lines.push({
        y: this.yForMidi(midi),
        midi,
        label: noteName(midi),
        isC: midi % 12 === 0,
      });
    }
    return lines;
  }
}
