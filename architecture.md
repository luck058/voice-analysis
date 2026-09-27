# Architecture: Voice Coach

## Overview

A browser app that listens to the microphone and analyses the user's voice in real
time: pitch (Hz, note, cents), a pitch trace, a spectrogram, level, formants on a
vowel chart, voice quality (jitter, shimmer, harmonics-to-noise ratio) and vibrato,
with a plain-language session summary when the user stops. It takes its measures
from singing trainers (tuner readout, pitch trace on a note grid, vibrato, range)
and accent/speech tools such as Praat (spectrogram, formants, vowel chart, voice
quality). Everything runs locally in the browser; there is no server.

Single language: TypeScript, bundled by Vite, tested with Jest in a Node
environment (no DOM in tests).

## Tech stack

- TypeScript 5, `strict` on (`tsconfig.json`). Test files are excluded from the
  type check; `npx tsc --noEmit -p tsconfig.json` is a blocking project gate.
- Vite 5 for the dev server and build (`npm run dev`, `npm run build`).
- Jest 29 with ts-jest, `testEnvironment: "node"`. The harness installs Jest and
  writes `jest.config.js` itself; do not add Jest configuration to the project
  (a second config makes Jest refuse to start) and do not add `"type": "module"`
  to package.json (the harness's `jest.config.js` is CommonJS).
- Web Audio API (AudioContext, AudioWorklet) and Canvas 2D in the browser only.
- **No runtime dependencies.** All DSP is written here. Do not add npm packages.

## Directory / module map

Every exported name below is part of the contract between items. Keep the names,
parameter order and return shapes exactly; add private helpers freely.

| Path | Responsibility |
|---|---|
| `src/config.ts` | Shared constants (exists): `DEFAULT_SAMPLE_RATE` 48000, `FRAME_SIZE` 2048, `HOP_SIZE` 512, `PITCH_MIN_HZ` 60, `PITCH_MAX_HZ` 1100, `A4_HZ` 440, `SILENCE_DBFS` -60 |
| `src/testing/synth.ts` | Deterministic test-signal generators (used by tests; no DOM) |
| `src/dsp/fft.ts` | Hann window, in-place radix-2 FFT, dB magnitude spectrum, bin frequency |
| `src/dsp/level.ts` | RMS and peak level in dBFS |
| `src/dsp/pitch.ts` | YIN fundamental-frequency detector |
| `src/dsp/formants.ts` | LPC formant estimator |
| `src/dsp/voiceQuality.ts` | Jitter, shimmer, harmonics-to-noise ratio |
| `src/music/notes.ts` | Hz ↔ MIDI note, note names, cents |
| `src/analysis/vibrato.ts` | Vibrato rate and extent from a pitch track |
| `src/analysis/frames.ts` | `FrameAssembler`: arbitrary audio chunks → overlapping frames + recent history |
| `src/analysis/analyser.ts` | `createAnalyser`: one call per frame, runs every measure |
| `src/analysis/session.ts` | `SessionStats` accumulator and `describeSession` feedback sentences |
| `src/views/spectrogram.ts` | `SpectrogramModel`: scrolling RGBA image, log frequency axis, colour map |
| `src/views/pitchTrace.ts` | `PitchTraceModel`: time/pitch → canvas coordinates on a semitone grid |
| `src/views/vowelChart.ts` | Reference vowels, F1/F2 → chart coordinates, nearest vowel |
| `src/app/metrics.ts` | `METRICS`: every displayed measure with a label, unit and plain-language explanation; `formatReadouts` |
| `src/app/controller.ts` | `createController`: the Start/Stop state machine, microphone errors |
| `src/app/audio.ts` | Browser-only microphone capture (AudioWorklet); never imported by tests |
| `src/app/render.ts` | HTML-string builders and canvas painters for each panel |
| `src/main.ts` | Browser entry: builds the page, wires controller, audio, analyser and render loop |

### Shared shapes

```ts
// src/dsp/pitch.ts
export interface PitchResult { hz: number; clarity: number }        // clarity in [0, 1]
// src/dsp/formants.ts
export interface Formant { hz: number; bandwidthHz: number }
// src/dsp/voiceQuality.ts
export interface VoiceQuality { jitterPercent: number; shimmerPercent: number; hnrDb: number }
// src/music/notes.ts
export interface NoteInfo { midi: number; name: string; octave: number; cents: number } // name like "C#", cents in [-50, 50)
// src/analysis/vibrato.ts
export interface PitchPoint { timeSec: number; cents: number }        // cents relative to any fixed reference
export interface Vibrato { rateHz: number; extentCents: number }
// src/analysis/analyser.ts
export interface FrameAnalysis {
  timeSec: number;
  levelDbfs: number;
  pitch: (PitchResult & { note: NoteInfo }) | null;
  spectrumDb: Float32Array;             // FRAME_SIZE / 2 + 1 bins
  formants: Formant[];                  // empty when unvoiced
  voiceQuality: VoiceQuality | null;    // latest value, refreshed about every 0.5 s of voiced audio
  vibrato: Vibrato | null;              // from the last 2 s of pitch
}
```

## Conventions

- Named exports only; no default exports. Explicit types on every export.
- Audio is `Float32Array` in [-1, 1]; sample rate is always passed explicitly.
- `src/dsp`, `src/music`, `src/analysis` and `src/views` are pure: no DOM, no Web
  Audio, no timers, no `Math.random`. Only `src/app/audio.ts` and `src/main.ts`
  touch browser APIs; `src/app/render.ts` touches only a `CanvasRenderingContext2D`
  passed in (tests pass a fake with the methods they need).
- Invalid input throws `RangeError` with a message naming the parameter (for
  example a non-power-of-two FFT length). "No answer" (silence, unvoiced audio) is
  `null`, never an exception and never `NaN`.
- User-facing text is plain English for someone with no audio or music-theory
  background, and says what a number means for their voice.

## Data flow

1. `audio.ts` captures microphone blocks (128 samples each, from an AudioWorklet)
   and hands them to a `FrameAssembler`.
2. The assembler emits a `FRAME_SIZE` frame every `HOP_SIZE` samples and keeps the
   last few seconds of contiguous audio.
3. `analyser.process(frame, timeSec)` returns a `FrameAnalysis`: level, pitch and
   note, spectrum, and formants every frame; voice quality over recent voiced audio;
   vibrato over the recent pitch track.
4. `main.ts` feeds each analysis to the views' models and to `SessionStats`, and
   paints on `requestAnimationFrame`.
5. On Stop, `describeSession(stats.summary())` produces the summary sentences.

## Existing interfaces relevant to upcoming work

`src/config.ts` and its test exist. `src/main.ts` is a placeholder that the app
work replaces. `index.html` loads `/src/main.ts` into `<div id="app">`.

## Testing conventions

- Tests are colocated: `src/<dir>/<module>.test.ts`.
- Generate audio with `src/testing/synth.ts` (once it exists). Never use
  `Math.random`; use `whiteNoise` with a seed, so every run sees the same signal.
- Floats: `toBeCloseTo` for exact maths; for estimates, assert a relative
  tolerance explicitly, e.g. `expect(Math.abs(hz - 220) / 220).toBeLessThan(0.005)`.
- Keep each test fast (under a second): frames of `FRAME_SIZE` samples at 48 kHz,
  and no more than 2 seconds of synthesized audio in any one test.

## Architecture decisions log

- 2026-09-27: Browser app, not desktop: nothing to install beyond `npm install`,
  and Web Audio gives low-latency microphone access (the request asks for ease of
  use).
- 2026-09-27: All DSP hand-written and pure, so every measure is unit-tested
  against synthesized signals with known answers; the only untested code is the
  thin browser glue in `audio.ts` and `main.ts`.
- 2026-09-27: YIN for pitch (robust to octave errors on harmonic-rich voices); LPC
  for formants (the standard method, as in Praat); Praat's local definitions for
  jitter and shimmer.

## Out of scope / deferred

- Phoneme or word scoring, speech recognition, and any machine-learned model.
- Recording, saving or uploading audio; accounts; a server.
- Mobile layouts and touch-specific UI (desktop browser first).
- Exercises, target melodies, or lessons.
