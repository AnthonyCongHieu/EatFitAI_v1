import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "public", "audio", "eatfitai-beat.wav");

const sampleRate = 44100;
const seconds = 76;
const channels = 2;
const bpm = 126;
const beatSeconds = 60 / bpm;
const totalSamples = Math.floor(sampleRate * seconds);
const data = new Float32Array(totalSamples);

const notes = {
  A1: 55,
  A2: 110,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196,
  A3: 220,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  A4: 440,
  C5: 523.25,
};

const progression = [
  [notes.A2, notes.C3, notes.E3, notes.A3],
  [notes.F3, notes.A3, notes.C4, notes.E4],
  [notes.C3, notes.E3, notes.G3, notes.C4],
  [notes.G3, notes.B3, notes.D4, notes.G4],
];

const melody = [notes.E4, notes.G4, notes.A4, notes.C5, notes.A4, notes.G4, notes.E4, notes.D4];

const envelope = (t, attack, decay) => {
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay);
};

const sine = (frequency, t) => Math.sin(2 * Math.PI * frequency * t);
const saw = (frequency, t) => 2 * (frequency * t - Math.floor(0.5 + frequency * t));
const triangle = (frequency, t) => (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
const noise = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

const lowPass = (sample, previous, amount) => previous + (sample - previous) * amount;

let hatFilter = 0;

for (let i = 0; i < totalSamples; i += 1) {
  const t = i / sampleRate;
  const beat = t / beatSeconds;
  const beatIndex = Math.floor(beat);
  const barIndex = Math.floor(beatIndex / 4);
  const beatInBar = beatIndex % 4;
  const sixteenth = Math.floor(beat * 4);
  const chord = progression[barIndex % progression.length];
  const sectionLift = t > 22 ? 1.12 : 0.92;
  let sample = 0;

  for (const [index, frequency] of chord.entries()) {
    const chordGain = (0.024 + index * 0.004) * sectionLift;
    sample += triangle(frequency, t) * chordGain;
    sample += saw(frequency * 2, t) * chordGain * 0.1;
  }

  const bassFrequency = chord[0] / 2;
  sample += sine(bassFrequency, t) * 0.1;
  sample += triangle(bassFrequency, t) * 0.045;

  const stepT = (beat % 0.5) * beatSeconds;
  const arpeggioFrequency = chord[sixteenth % chord.length] * (sixteenth % 8 > 4 ? 2 : 1);
  sample += sine(arpeggioFrequency, stepT) * envelope(stepT, 0.004, 0.13) * 0.1;

  const melodyT = (beat % 1) * beatSeconds;
  if (barIndex >= 2) {
    const leadFrequency = melody[beatIndex % melody.length];
    sample += triangle(leadFrequency, melodyT) * envelope(melodyT, 0.006, 0.2) * 0.075;
    sample += sine(leadFrequency * 2, melodyT) * envelope(melodyT, 0.006, 0.15) * 0.026;
  }

  const kickT = (beat % 1) * beatSeconds;
  const kickHit = beatInBar === 0 || beatInBar === 2 || (barIndex > 3 && beatInBar === 3 && beat % 1 > 0.48);
  if (kickHit) {
    const kickEnv = envelope(kickT, 0.004, 0.15);
    const sweep = 44 + 92 * Math.exp(-kickT / 0.052);
    sample += sine(sweep, kickT) * kickEnv * 0.9;
  }

  if (beatInBar === 1 || beatInBar === 3) {
    const clapT = (beat % 1) * beatSeconds;
    const clapEnv = envelope(clapT, 0.002, 0.07);
    sample += noise(i) * clapEnv * 0.17;
    sample += sine(210, clapT) * clapEnv * 0.09;
  }

  const hatT = ((beat * 2) % 1) * (beatSeconds / 2);
  const openHat = sixteenth % 8 === 6;
  const hatEnv = envelope(hatT, 0.001, openHat ? 0.12 : 0.034);
  hatFilter = lowPass(noise(i * 0.017 + sixteenth), hatFilter, 0.56);
  sample += (noise(i * 0.071) - hatFilter) * hatEnv * (openHat ? 0.09 : 0.052);

  const transitionDistance = Math.min(...[5, 13, 23, 33, 40, 51, 59, 67].map((point) => Math.abs(t - point)));
  if (transitionDistance < 0.58) {
    const riser = (0.58 - transitionDistance) / 0.58;
    sample += noise(i * 0.031) * riser * 0.04;
    sample += sine(520 + riser * 680, t) * riser * 0.035;
  }

  const introFade = Math.min(1, t / 1.2);
  const outroFade = Math.min(1, (seconds - t) / 2.8);
  data[i] = Math.max(-0.95, Math.min(0.95, sample * introFade * outroFade * 0.82));
}

const headerSize = 44;
const dataSize = totalSamples * channels * 2;
const buffer = Buffer.alloc(headerSize + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * channels * 2, 28);
buffer.writeUInt16LE(channels * 2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

for (let i = 0; i < totalSamples; i += 1) {
  const left = data[i] + (data[Math.max(0, i - 89)] ?? 0) * 0.018;
  const right = data[i] * 0.94 + (data[Math.max(0, i - 61)] ?? 0) * 0.06;
  buffer.writeInt16LE(Math.round(Math.max(-0.95, Math.min(0.95, left)) * 32767), headerSize + i * 4);
  buffer.writeInt16LE(Math.round(Math.max(-0.95, Math.min(0.95, right)) * 32767), headerSize + i * 4 + 2);
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, buffer);
console.log(`Generated ${output}`);
