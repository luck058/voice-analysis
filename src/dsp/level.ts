// Level measurement functions

export function rmsDbfs(frame: Float32Array): number {
  let sumSq = 0;
  for (let i = 0; i < frame.length; i++) {
    sumSq += frame[i] * frame[i];
  }
  const meanSq = sumSq / frame.length;
  if (meanSq === 0) {
    return -120;
  }
  const rms = Math.sqrt(meanSq);
  const db = 20 * Math.log10(rms);
  return Math.max(db, -120);
}

export function peakDbfs(frame: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < frame.length; i++) {
    const abs = Math.abs(frame[i]);
    if (abs > peak) peak = abs;
  }
  if (peak === 0) {
    return -120;
  }
  const db = 20 * Math.log10(peak);
  return Math.max(db, -120);
}
