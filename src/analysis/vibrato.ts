export interface PitchPoint {
  timeSec: number;
  cents: number;
}

export interface Vibrato {
  rateHz: number;
  extentCents: number;
}

export interface VibratoOptions {
  minRateHz?: number;
  maxRateHz?: number;
  minExtentCents?: number;
}

/**
 * Detect vibrato rate and extent from a pitch track.
 *
 * @param track - Array of pitch points in time order (may be irregularly spaced)
 * @param options - Detection thresholds (defaults: minRateHz=3, maxRateHz=9, minExtentCents=10)
 * @returns Vibrato object with rateHz and extentCents, or null if no vibrato detected
 * @throws RangeError if track is empty or options contain invalid values
 */
export function detectVibrato(
  track: PitchPoint[],
  options?: VibratoOptions
): Vibrato | null {
  if (track.length === 0) {
    throw new RangeError('track must not be empty');
  }

  const minRateHz = options?.minRateHz ?? 3;
  const maxRateHz = options?.maxRateHz ?? 9;
  const minExtentCents = options?.minExtentCents ?? 10;

  if (minRateHz <= 0 || maxRateHz <= minRateHz || minExtentCents < 0) {
    throw new RangeError('invalid vibrato options');
  }

  // Split into contiguous runs (gap > 0.1 s)
  const runs = splitRuns(track, 0.1);

  // Select longest run by point count
  const longestRun = selectLongestRun(runs);
  if (!longestRun || longestRun.length < 20) {
    return null;
  }

  const duration =
    longestRun[longestRun.length - 1].timeSec - longestRun[0].timeSec;
  if (duration < 1.0) {
    return null;
  }

  // Remove linear trend
  const detrended = removeLinearTrend(longestRun);

  // Resample to 100 Hz
  const sampleRate = 100;
  const resampled = resampleUniform(detrended, sampleRate);

  // Dominant periodicity via zero crossings
  const rateHz = findDominantRate(resampled, sampleRate);
  if (rateHz === null) {
    return null;
  }

  // Extent via half mean peak-to-trough excursion
  const extentCents = findExtent(resampled);

  if (
    rateHz < minRateHz ||
    rateHz > maxRateHz ||
    extentCents < minExtentCents
  ) {
    return null;
  }

  return { rateHz, extentCents };
}

function splitRuns(
  track: PitchPoint[],
  gapThresholdSec: number
): PitchPoint[][] {
  const runs: PitchPoint[][] = [];
  let currentRun: PitchPoint[] = [track[0]];

  for (let i = 1; i < track.length; i++) {
    if (track[i].timeSec - track[i - 1].timeSec > gapThresholdSec) {
      runs.push(currentRun);
      currentRun = [track[i]];
    } else {
      currentRun.push(track[i]);
    }
  }
  runs.push(currentRun);

  return runs;
}

function selectLongestRun(runs: PitchPoint[][]): PitchPoint[] | null {
  if (runs.length === 0) {
    return null;
  }

  let best: PitchPoint[] = runs[0];
  for (let i = 1; i < runs.length; i++) {
    if (runs[i].length > best.length) {
      best = runs[i];
    }
  }
  return best;
}

function removeLinearTrend(points: PitchPoint[]): PitchPoint[] {
  const n = points.length;

  let sumT = 0;
  let sumC = 0;
  let sumTC = 0;
  let sumT2 = 0;

  for (let i = 0; i < n; i++) {
    const t = points[i].timeSec;
    const c = points[i].cents;
    sumT += t;
    sumC += c;
    sumTC += t * c;
    sumT2 += t * t;
  }

  const denom = n * sumT2 - sumT * sumT;
  if (Math.abs(denom) < 1e-12) {
    return points.map((p) => ({ timeSec: p.timeSec, cents: p.cents }));
  }

  const a = (n * sumTC - sumT * sumC) / denom;
  const b = (sumC - a * sumT) / n;

  return points.map((p) => ({
    timeSec: p.timeSec,
    cents: p.cents - (a * p.timeSec + b),
  }));
}

function resampleUniform(
  points: PitchPoint[],
  sampleRate: number
): Float32Array {
  const tStart = points[0].timeSec;
  const tEnd = points[points.length - 1].timeSec;
  const duration = tEnd - tStart;
  const numSamples = Math.round(duration * sampleRate);

  const result = new Float32Array(numSamples);
  let pointIdx = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = tStart + i / sampleRate;

    while (
      pointIdx + 1 < points.length &&
      points[pointIdx + 1].timeSec < t
    ) {
      pointIdx++;
    }

    if (pointIdx + 1 >= points.length) {
      result[i] = points[points.length - 1].cents;
    } else {
      const p0 = points[pointIdx];
      const p1 = points[pointIdx + 1];
      const dt = p1.timeSec - p0.timeSec;
      if (dt < 1e-12) {
        result[i] = p0.cents;
      } else {
        const alpha = (t - p0.timeSec) / dt;
        result[i] = p0.cents + alpha * (p1.cents - p0.cents);
      }
    }
  }

  return result;
}

function findDominantRate(
  signal: Float32Array,
  sampleRate: number
): number | null {
  const n = signal.length;
  if (n < 4) {
    return null;
  }

  // Count zero crossings by tracking sign changes between non-zero values
  let crossings = 0;
  let prevSign = 0;

  for (let i = 0; i < n; i++) {
    const s = Math.sign(signal[i]);
    if (s !== 0) {
      if (prevSign !== 0 && s !== prevSign) {
        crossings++;
      }
      prevSign = s;
    }
  }

  if (crossings < 2) {
    return null;
  }

  const duration = n / sampleRate;
  return crossings / (2 * duration);
}

function findExtent(signal: Float32Array): number {
  // Find local maxima and minima
  const extrema: number[] = [];

  for (let i = 1; i < signal.length - 1; i++) {
    if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1]) {
      extrema.push(signal[i]);
    } else if (signal[i] < signal[i - 1] && signal[i] < signal[i + 1]) {
      extrema.push(signal[i]);
    }
  }

  if (extrema.length < 2) {
    return 0;
  }

  let totalExcursion = 0;
  for (let i = 1; i < extrema.length; i++) {
    totalExcursion += Math.abs(extrema[i] - extrema[i - 1]);
  }

  return totalExcursion / (2 * (extrema.length - 1));
}