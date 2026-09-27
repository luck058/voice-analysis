import {
  DEFAULT_SAMPLE_RATE,
  FRAME_SIZE,
  HOP_SIZE,
  PITCH_MAX_HZ,
  PITCH_MIN_HZ,
} from "./config";

describe("analysis constants", () => {
  it("uses a power-of-two frame size for the FFT", () => {
    expect(Math.log2(FRAME_SIZE) % 1).toBe(0);
  });

  it("fits at least two periods of the lowest pitch in one frame, at 44.1 and 48 kHz", () => {
    for (const rate of [44100, DEFAULT_SAMPLE_RATE]) {
      expect(FRAME_SIZE / rate).toBeGreaterThanOrEqual(2 / PITCH_MIN_HZ);
    }
  });

  it("hops by no more than a frame and has a sensible pitch range", () => {
    expect(HOP_SIZE).toBeGreaterThan(0);
    expect(HOP_SIZE).toBeLessThanOrEqual(FRAME_SIZE);
    expect(PITCH_MIN_HZ).toBeLessThan(PITCH_MAX_HZ);
    expect(PITCH_MAX_HZ).toBeLessThan(DEFAULT_SAMPLE_RATE / 2);
  });
});
