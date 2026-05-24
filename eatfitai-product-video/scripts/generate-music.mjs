import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "public", "audio", "eatfitai-beat.wav");

const sampleRate = 44100;
const seconds = 52;
const channels = 2;
const bpm = 104;
const beatSeconds = 60 / bpm;
const totalSamples = Math.floor(sampleRate * seconds);
const leftData = new Float32Array(totalSamples);
const rightData = new Float32Array(totalSamples);

const notes = {
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  G2: 98,
  A2: 110,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  G3: 196,
  A3: 220,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
};

const progression = [
  [notes.C3, notes.E3, notes.G3, notes.B3],
  [notes.A2, notes.E3, notes.G3, notes.C4],
  [notes.E2, notes.B2, notes.D3, notes.G3],
  [notes.G2, notes.D3, notes.A3, notes.B3],
];

const melody = [notes.E4, notes.G4, notes.B4, notes.A4, notes.G4, notes.E4, notes.D4, notes.C4];

const clamp = (value) => Math.max(-0.94, Math.min(0.94, value));
const sine = (frequency, t) => Math.sin(2 * Math.PI * frequency * t);
const triangle = (frequency, t) => (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
const bell = (frequency, t) => sine(frequency, t) * 0.75 + sine(frequency * 2.01, t) * 0.18 + sine(frequency * 3.02, t) * 0.07;
const noise = (seed) => {
  const x = Math.sin(seed * 19.19 + 91.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

const envelope = (t, attack, decay) => {
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay);
};

const smoothStep = (edge0, edge1, value) => {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
};

let hatsFilter = 0;
let airFilter = 0;

for (let i = 0; i < totalSamples; i += 1) {
  const t = i / sampleRate;
  const beat = t / beatSeconds;
  const beatIndex = Math.floor(beat);
  const barIndex = Math.floor(beatIndex / 4);
  const beatInBar = beatIndex % 4;
  const eighth = Math.floor(beat * 2);
  const chord = progression[barIndex % progression.length];
  const lift = 0.72 + smoothStep(6, 18, t) * 0.24 + smoothStep(30, 42, t) * 0.18;
  let mono = 0;

  for (const [index, frequency] of chord.entries()) {
    const padGain = (0.014 + index * 0.0025) * lift;
    mono += sine(frequency, t) * padGain;
    mono += sine(frequency * 2.003, t) * padGain * 0.14;
  }

  const pianoT = (beat % 1) * beatSeconds;
  const pianoFrequency = chord[(beatIndex + 2) % chord.length] * (beatInBar % 2 === 0 ? 2 : 1);
  mono += bell(pianoFrequency, pianoT) * envelope(pianoT, 0.004, 0.28) * 0.075 * lift;

  const melodyT = (beat % 0.5) * beatSeconds;
  const melodyFrequency = melody[eighth % melody.length];
  if (barIndex >= 1) {
    mono += bell(melodyFrequency, melodyT) * envelope(melodyT, 0.006, 0.16) * 0.034;
  }

  const bassFrequency = chord[0] / 2;
  mono += sine(bassFrequency, t) * 0.045 * lift;
  mono += triangle(bassFrequency, t) * 0.015 * lift;

  const kickT = (beat % 1) * beatSeconds;
  if (beatInBar === 0 || beatInBar === 2) {
    const kickEnv = envelope(kickT, 0.002, 0.11);
    mono += sine(48 + 62 * Math.exp(-kickT / 0.045), kickT) * kickEnv * 0.36;
  }

  if (beatInBar === 1 || beatInBar === 3) {
    const clapT = (beat % 1) * beatSeconds;
    const clapEnv = envelope(clapT, 0.002, 0.055);
    mono += noise(i * 0.41) * clapEnv * 0.045;
    mono += sine(420, clapT) * clapEnv * 0.025;
  }

  const hatT = ((beat * 2) % 1) * (beatSeconds / 2);
  hatsFilter += (noise(i * 0.031) - hatsFilter) * 0.42;
  mono += (noise(i * 0.077) - hatsFilter) * envelope(hatT, 0.001, 0.038) * 0.02;

  airFilter += (noise(i * 0.004) - airFilter) * 0.012;
  mono += airFilter * 0.012 * smoothStep(4, 16, t);

  const transitionDistance = Math.min(...[7, 13, 18, 23, 28, 35, 40, 45].map((point) => Math.abs(t - point)));
  if (transitionDistance < 0.36) {
    const riser = (0.36 - transitionDistance) / 0.36;
    mono += bell(880 + riser * 260, t) * riser * 0.018;
    mono += noise(i * 0.023) * riser * 0.014;
  }

  const introFade = Math.min(1, t / 1.1);
  const outroFade = Math.min(1, (seconds - t) / 2.2);
  const master = introFade * outroFade * 1.02;
  const pan = Math.sin(t * 0.33) * 0.16;
  const echoL = leftData[Math.max(0, i - 5200)] ?? 0;
  const echoR = rightData[Math.max(0, i - 6100)] ?? 0;
  leftData[i] = clamp((mono * (1 - pan) + echoR * 0.055) * master);
  rightData[i] = clamp((mono * (1 + pan) + echoL * 0.055) * master);
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
  buffer.writeInt16LE(Math.round(leftData[i] * 32767), headerSize + i * 4);
  buffer.writeInt16LE(Math.round(rightData[i] * 32767), headerSize + i * 4 + 2);
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, buffer);
console.log(`Generated fresh background music: ${output}`);
