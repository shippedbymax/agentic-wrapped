import { BEATS_PER_SCENE, BEAT_SEC } from './timing';

/**
 * The soundtrack, synthesized from scratch: kick, snare, hi-hat, bass and a pluck.
 * Pure function: same input, same samples. No audio files, nothing to license.
 */

const TWO_PI = Math.PI * 2;
/** Root notes of the four-bar loop (A minor, F, C, G), in Hz. */
const BAR_ROOTS_HZ = [55.0, 43.65, 65.41, 49.0];
/** Chord tones as frequency ratios to the root: root, fifth, octave, major/minor tenth. */
const BAR_ARPEGGIOS = [
  [4, 6, 8, 9.51],
  [4, 6, 8, 10.08],
  [4, 6, 8, 10.08],
  [4, 6, 8, 10.08],
];

function createNoise(): () => number {
  let seed = 22222;
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 2147483648 - 1;
  };
}

export function renderBeat(sampleRate: number, barCount: number): Float32Array {
  const barSec = BEAT_SEC * BEATS_PER_SCENE;
  const samples = new Float32Array(Math.ceil(barCount * barSec * sampleRate));
  const noise = createNoise();

  const addVoice = (startSec: number, lengthSec: number, voice: (t: number) => number) => {
    const start = Math.round(startSec * sampleRate);
    const length = Math.round(lengthSec * sampleRate);
    for (let i = 0; i < length && start + i < samples.length; i += 1) {
      samples[start + i] = (samples[start + i] ?? 0) + voice(i / sampleRate);
    }
  };

  const addKick = (startSec: number) => {
    let phase = 0;
    addVoice(startSec, 0.4, (t) => {
      phase += (TWO_PI * (44 + 120 * Math.exp(-t * 28))) / sampleRate;
      return Math.sin(phase) * Math.exp(-t * 8) * 0.95;
    });
  };
  const addSnare = (startSec: number) =>
    addVoice(
      startSec,
      0.22,
      (t) =>
        noise() * Math.exp(-t * 24) * 0.42 + Math.sin(TWO_PI * 190 * t) * Math.exp(-t * 34) * 0.3,
    );
  const addHat = (startSec: number, gain: number) => {
    let previous = 0;
    addVoice(startSec, 0.06, (t) => {
      const current = noise();
      const highPassed = current - previous;
      previous = current;
      return highPassed * Math.exp(-t * 85) * gain;
    });
  };
  const addBass = (startSec: number, frequencyHz: number, lengthSec: number) =>
    addVoice(startSec, lengthSec, (t) => {
      const envelope = Math.min(1, t / 0.006) * Math.exp(-t * 3.5);
      return (
        (Math.sin(TWO_PI * frequencyHz * t) + 0.35 * Math.sin(TWO_PI * frequencyHz * 2 * t)) *
        envelope *
        0.5
      );
    });
  const addPluck = (startSec: number, frequencyHz: number) =>
    addVoice(startSec, 0.5, (t) => {
      const envelope = Math.min(1, t / 0.004) * Math.exp(-t * 7);
      const tone =
        Math.sin(TWO_PI * frequencyHz * t) +
        0.5 * Math.sin(TWO_PI * frequencyHz * 2 * t) +
        0.25 * Math.sin(TWO_PI * frequencyHz * 3 * t);
      return tone * envelope * 0.11;
    });

  for (let bar = 0; bar < barCount; bar += 1) {
    const barStart = bar * barSec;
    const isIntro = bar === 0;
    const rootHz = BAR_ROOTS_HZ[bar % BAR_ROOTS_HZ.length] ?? 55;
    const arpeggio = BAR_ARPEGGIOS[bar % BAR_ARPEGGIOS.length] ?? [4, 6, 8, 10];

    for (let eighth = 0; eighth < 8; eighth += 1) {
      const eighthStart = barStart + eighth * (BEAT_SEC / 2);
      addHat(eighthStart, eighth % 2 === 0 ? 0.16 : 0.09);
      addPluck(eighthStart, rootHz * (arpeggio[(eighth * 3) % arpeggio.length] ?? 4));
    }
    if (isIntro) {
      // The intro holds back the drums and ends with a fill into the drop.
      for (let step = 0; step < 4; step += 1) addSnare(barStart + (3 + step / 4) * BEAT_SEC);
      continue;
    }
    addKick(barStart);
    addKick(barStart + 1.5 * BEAT_SEC);
    addKick(barStart + 2 * BEAT_SEC);
    addSnare(barStart + 1 * BEAT_SEC);
    addSnare(barStart + 3 * BEAT_SEC);
    addBass(barStart, rootHz, BEAT_SEC * 1.4);
    addBass(barStart + 1.5 * BEAT_SEC, rootHz, BEAT_SEC * 0.5);
    addBass(barStart + 2 * BEAT_SEC, rootHz, BEAT_SEC * 1.2);
    addBass(barStart + 3.5 * BEAT_SEC, rootHz * 1.5, BEAT_SEC * 0.5);
  }

  // Soft clip, then fade the last half second so the clip does not end with a click.
  const fadeLength = Math.round(0.5 * sampleRate);
  for (let i = 0; i < samples.length; i += 1) {
    const fade = Math.min(1, (samples.length - i) / fadeLength);
    samples[i] = Math.tanh((samples[i] ?? 0) * 1.1) * 0.85 * fade;
  }
  return samples;
}
