/**
 * Analysis constants shared by every module, so the DSP pieces agree on frame
 * sizes and pitch range. Change them here, never inline.
 */

/** Sample rate assumed when none is known yet. Browsers usually give 48000 or 44100. */
export const DEFAULT_SAMPLE_RATE = 48000;

/** Samples per analysis frame. A power of two, for the FFT. */
export const FRAME_SIZE = 2048;

/** Samples between the starts of consecutive frames. */
export const HOP_SIZE = 512;

/** The lowest and highest fundamental frequency the pitch detector reports. */
export const PITCH_MIN_HZ = 60;
export const PITCH_MAX_HZ = 1100;

/** Concert pitch: the frequency of A4. */
export const A4_HZ = 440;

/** Below this RMS level (dBFS) a frame is treated as silence. */
export const SILENCE_DBFS = -60;
