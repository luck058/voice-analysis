import { detectVibrato, PitchPoint } from './vibrato';

function makeTrack(
  durationSec: number,
  stepSec: number,
  cents: (t: number) => number
): PitchPoint[] {
  const track: PitchPoint[] = [];
  const n = Math.round(durationSec / stepSec);
  for (let i = 0; i <= n; i++) {
    const t = i * stepSec;
    track.push({ timeSec: t, cents: cents(t) });
  }
  return track;
}

describe('detectVibrato', () => {
  const step = 0.01;

  test('throws RangeError on empty track', () => {
    expect(() => detectVibrato([])).toThrow(RangeError);
  });

  test('detects 5.5 Hz vibrato with 50-cent extent', () => {
    const track = makeTrack(2, step, (t) => 50 * Math.sin(2 * Math.PI * 5.5 * t));
    const v = detectVibrato(track);
    expect(v).not.toBeNull();
    expect(Math.abs(v!.rateHz - 5.5)).toBeLessThan(0.3);
    expect(Math.abs(v!.extentCents - 50)).toBeLessThan(5);
  });

  test('ignores a linear drift of +100 cents per second', () => {
    const track = makeTrack(
      2,
      step,
      (t) => 50 * Math.sin(2 * Math.PI * 5.5 * t) + 100 * t
    );
    const v = detectVibrato(track);
    expect(v).not.toBeNull();
    expect(Math.abs(v!.rateHz - 5.5)).toBeLessThan(0.3);
    expect(Math.abs(v!.extentCents - 50)).toBeLessThan(7);
  });

  test('returns null for a flat track', () => {
    const track = makeTrack(2, step, () => 220);
    expect(detectVibrato(track)).toBeNull();
  });

  test('returns null for 1 Hz oscillation (too slow)', () => {
    const track = makeTrack(2, step, (t) => 20 * Math.sin(2 * Math.PI * 1 * t));
    expect(detectVibrato(track)).toBeNull();
  });

  test('returns null for 5-cent oscillation (too small)', () => {
    const track = makeTrack(2, step, (t) => 5 * Math.sin(2 * Math.PI * 6 * t));
    expect(detectVibrato(track)).toBeNull();
  });

  test('returns null for 0.8 s of good vibrato (too short)', () => {
    const track = makeTrack(0.8, step, (t) => 50 * Math.sin(2 * Math.PI * 5.5 * t));
    expect(detectVibrato(track)).toBeNull();
  });

  test('a 0.3 s gap in 3 s of vibrato still gives the right rate', () => {
    const track: PitchPoint[] = [];
    // 0 to 1.35 s
    for (let i = 0; i <= 135; i++) {
      const t = i * step;
      track.push({ timeSec: t, cents: 50 * Math.sin(2 * Math.PI * 5.5 * t) });
    }
    // gap: skip 1.35 to 1.65 s
    for (let i = 166; i <= 300; i++) {
      const t = i * step;
      track.push({ timeSec: t, cents: 50 * Math.sin(2 * Math.PI * 5.5 * t) });
    }
    const v = detectVibrato(track);
    expect(v).not.toBeNull();
    expect(Math.abs(v!.rateHz - 5.5)).toBeLessThan(0.3);
  });

  test('respects custom option thresholds', () => {
    // 20 cents at 1 Hz: null with defaults, but detectable with relaxed options
    const track = makeTrack(2, step, (t) => 20 * Math.sin(2 * Math.PI * 1 * t));
    expect(detectVibrato(track)).toBeNull();
    const v = detectVibrato(track, { minRateHz: 0.5, maxRateHz: 2, minExtentCents: 5 });
    expect(v).not.toBeNull();
    expect(Math.abs(v!.rateHz - 1)).toBeLessThan(0.3);
  });
});
