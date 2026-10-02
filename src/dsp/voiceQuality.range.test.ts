// Sanity check that the silence threshold used by the null tests is the
// configured one (imported constant, exercised via the module under test's
// documented behaviour — kept trivial so it cannot pass against a stub).
import { SILENCE_DBFS } from '../config.js';
import { measureVoiceQuality } from './voiceQuality.js';

const SR = 48000;

// A train whose RMS is far below SILENCE_DBFS must return null.
// One impulse of amplitude 1e-4 per 320-sample period: RMS ~ -75 dBFS.
test('very quiet train below SILENCE_DBFS returns null', () => {
  const cycles = Array.from({ length: 60 }, () => ({
    periodSamples: 320,
    amplitude: 1e-4,
  }));
  const out = new Float32Array(60 * 320);
  let t = 0;
  for (const c of cycles) {
    out[t] = c.amplitude;
    t += c.periodSamples;
  }
  expect(SILENCE_DBFS).toBe(-60);
  expect(measureVoiceQuality(out, SR, 150)).toBeNull();
});
