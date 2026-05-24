import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(root, "public", "audio", "sfx");
const sampleRate = 44100;
const channels = 2;

const clamp = (value) => Math.max(-0.95, Math.min(0.95, value));
const sine = (frequency, t) => Math.sin(2 * Math.PI * frequency * t);
const noise = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

const envelope = (t, attack, decay) => {
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay);
};

const writeWav = (filename, seconds, sampler) => {
  const totalSamples = Math.floor(sampleRate * seconds);
  const dataSize = totalSamples * channels * 2;
  const buffer = Buffer.alloc(44 + dataSize);

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
    const t = i / sampleRate;
    const [left, right] = sampler(t, i);
    buffer.writeInt16LE(Math.round(clamp(left) * 32767), 44 + i * 4);
    buffer.writeInt16LE(Math.round(clamp(right) * 32767), 44 + i * 4 + 2);
  }

  writeFileSync(join(outputDir, filename), buffer);
  console.log(`Generated ${filename}`);
};

mkdirSync(outputDir, { recursive: true });

writeWav("camera-shutter.wav", 0.42, (t, i) => {
  const clickA = noise(i * 0.37) * envelope(t, 0.001, 0.026);
  const clickB = noise(i * 0.53) * envelope(t - 0.095, 0.001, 0.035);
  const body = sine(180, t) * envelope(t - 0.02, 0.003, 0.08);
  const value = clickA * 0.34 + clickB * 0.28 + body * 0.16;
  return [value * 0.9, value * 0.82];
});

writeWav("success-ting.wav", 0.72, (t) => {
  const first = sine(740, t) * envelope(t, 0.003, 0.16);
  const second = sine(1046, t - 0.075) * envelope(t - 0.075, 0.004, 0.22);
  const shimmer = sine(1568, t - 0.13) * envelope(t - 0.13, 0.005, 0.2);
  const value = first * 0.22 + second * 0.3 + shimmer * 0.14;
  return [value * 0.84, value];
});

writeWav("soft-pop.wav", 0.34, (t) => {
  const body = sine(260 - t * 120, t) * envelope(t, 0.002, 0.09);
  const top = sine(680, t) * envelope(t, 0.001, 0.04);
  const value = body * 0.28 + top * 0.12;
  return [value, value * 0.9];
});

writeWav("tap.wav", 0.2, (t, i) => {
  const transient = noise(i * 0.91) * envelope(t, 0.001, 0.018);
  const tone = sine(520, t) * envelope(t, 0.001, 0.035);
  const value = transient * 0.13 + tone * 0.12;
  return [value, value];
});
