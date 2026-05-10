import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "public", "audio", "eatfitai-beat.wav");

const sampleRate = 44100;
const seconds = 48;
const channels = 2;
const bpm = 120;
const beatSeconds = 60 / bpm;
const totalSamples = Math.floor(sampleRate * seconds);
const data = new Float32Array(totalSamples);

const notes = {
  A2: 110,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196,
  A3: 220,
  B3: 246.94,
  C4: 261.63,
  E4: 329.63,
  G4: 392,
};

const chords = [
  [notes.A2, notes.C3, notes.E3, notes.A3],
  [notes.F3, notes.A3, notes.C4],
  [notes.C3, notes.E3, notes.G3, notes.C4],
  [notes.G3, notes.B3, notes.D3],
];

const envelope = (t, attack, decay) => {
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay);
};

const sine = (frequency, t) => Math.sin(2 * Math.PI * frequency * t);
const triangle = (frequency, t) => (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
const noise = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

for (let i = 0; i < totalSamples; i += 1) {
  const t = i / sampleRate;
  const beat = t / beatSeconds;
  const beatIndex = Math.floor(beat);
  const barIndex = Math.floor(beatIndex / 4);
  const beatInBar = beatIndex % 4;
  const sixteenth = Math.floor(beat * 4);
  const chord = chords[barIndex % chords.length];
  let sample = 0;

  for (const [index, frequency] of chord.entries()) {
    const chordGain = 0.035 + index * 0.006;
    sample += sine(frequency, t) * chordGain;
    sample += triangle(frequency * 2, t) * chordGain * 0.24;
  }

  const bassFrequency = chord[0] / 2;
  sample += sine(bassFrequency, t) * 0.09;

  const kickT = (beat % 1) * beatSeconds;
  const kickHit = beatInBar === 0 || beatInBar === 2;
  if (kickHit) {
    const kickEnv = envelope(kickT, 0.006, 0.16);
    const sweep = 46 + 76 * Math.exp(-kickT / 0.055);
    sample += sine(sweep, kickT) * kickEnv * 0.82;
  }

  if (beatInBar === 1 || beatInBar === 3) {
    const snareT = (beat % 1) * beatSeconds;
    const snareEnv = envelope(snareT, 0.002, 0.08);
    sample += noise(i) * snareEnv * 0.18;
    sample += sine(190, snareT) * snareEnv * 0.12;
  }

  const hatT = ((beat * 2) % 1) * (beatSeconds / 2);
  const hatEnv = envelope(hatT, 0.001, 0.035);
  sample += noise(sixteenth + i * 0.013) * hatEnv * 0.055;

  const pluckT = (beat % 2) * beatSeconds;
  const leadFrequency = [notes.E4, notes.G4, notes.C4, notes.A3][barIndex % 4];
  sample += sine(leadFrequency, pluckT) * envelope(pluckT, 0.004, 0.22) * 0.09;

  const transitionDistance = Math.min(
    ...[8, 16, 26, 36].map((point) => Math.abs(t - point)),
  );
  if (transitionDistance < 0.7) {
    const riser = (0.7 - transitionDistance) / 0.7;
    sample += noise(i * 0.071) * riser * 0.035;
    sample += sine(660 + riser * 520, t) * riser * 0.035;
  }

  const introFade = Math.min(1, t / 1.4);
  const outroFade = Math.min(1, (seconds - t) / 2.4);
  data[i] = Math.max(-0.95, Math.min(0.95, sample * introFade * outroFade));
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
  const left = data[i];
  const right = data[i] * 0.96 + (data[Math.max(0, i - 34)] ?? 0) * 0.04;
  buffer.writeInt16LE(Math.round(left * 32767), headerSize + i * 4);
  buffer.writeInt16LE(Math.round(right * 32767), headerSize + i * 4 + 2);
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, buffer);
console.log(`Generated ${output}`);
