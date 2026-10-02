/**
 * Scrolling spectrogram image model with a log frequency axis.
 * Converts a dB magnitude spectrum to a coloured column in a time-frequency image.
 */
export class SpectrogramModel {
  private readonly width: number;
  private readonly height: number;
  private readonly sampleRate: number;
  private readonly frameSize: number;
  private readonly minHz: number;
  private readonly maxHz: number;
  private readonly minDb: number;
  private readonly maxDb: number;
  
  /**
   * RGBA image data, width × height × 4 bytes.
   * Row 0 is the top (highest frequency), column 0 is the left (oldest time).
   * Each pixel is [r, g, b, a] with alpha always 255.
   */
  public readonly image: Uint8ClampedArray;
  
  /**
   * Create a spectrogram model.
   * @param options.width - Image width in pixels (columns of time)
   * @param options.height - Image height in pixels (rows of frequency)
   * @param options.sampleRate - Audio sample rate in Hz
   * @param options.frameSize - FFT size (number of bins in spectrumDb)
   * @param options.minHz - Minimum displayed frequency, default 50
   * @param options.maxHz - Maximum displayed frequency, default 8000
   * @param options.minDb - Minimum dB for colour mapping, default -100
   * @param options.maxDb - Maximum dB for colour mapping, default -20
   */
  constructor(options: {
    width: number;
    height: number;
    sampleRate: number;
    frameSize: number;
    minHz?: number;
    maxHz?: number;
    minDb?: number;
    maxDb?: number;
  }) {
    throw new Error('Not implemented');
  }
  
  /**
   * Get the frequency in Hz for a given row.
   * Row 0 corresponds to maxHz, row height-1 to minHz.
   * Frequencies are log-spaced between minHz and maxHz.
   * @param row - Row index, 0 ≤ row < height
   * @returns Frequency in Hz
   */
  hzForRow(row: number): number {
    throw new Error('Not implemented');
  }
  
  /**
   * Get the nearest row index for a given frequency.
   * The inverse of hzForRow, rounded to nearest integer and clamped to [0, height-1].
   * @param hz - Frequency in Hz
   * @returns Row index
   */
  rowForHz(hz: number): number {
    throw new Error('Not implemented');
  }
  
  /**
   * Map a dB value to an RGB colour.
   * Clamps db to [minDb, maxDb], maps to t in [0, 1], and linearly interpolates
   * between five colour stops at t = 0, 0.25, 0.5, 0.75, 1:
   * (0, 0, 4), (81, 18, 124), (183, 55, 121), (252, 137, 97), (252, 253, 191).
   * @param db - Decibel value
   * @returns [r, g, b] tuple, each 0–255
   */
  colourFor(db: number): [number, number, number] {
    throw new Error('Not implemented');
  }
  
  /**
   * Add a new spectrum column to the spectrogram.
   * Shifts every row left by one pixel and draws the new column at x = width-1.
   * Each row's pixel colour is determined by colourFor(spectrumValueAtHz),
   * where spectrumValueAtHz is linearly interpolated between the two nearest
   * bins (bin = hz * frameSize / sampleRate).
   * Alpha stays 255.
   * @param spectrumDb - dB magnitude spectrum, length frameSize/2 + 1
   */
  push(spectrumDb: Float32Array): void {
    throw new Error('Not implemented');
  }
}
