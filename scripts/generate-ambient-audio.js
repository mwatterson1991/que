#!/usr/bin/env node
/* eslint-env node */
/**
 * Generates ambient background audio WAV files for the Que app.
 *
 * Produces:
 *   assets/audio/ambient-theta.wav   — stereo binaural theta beat (200Hz L / 206Hz R → 6Hz beat)
 *   assets/audio/ambient-noise.wav   — mono pink noise (sounds like soft rain)
 *
 * Both are 30-second loops at 22050 Hz, 16-bit PCM — small enough for mobile bundling
 * and designed to loop seamlessly.
 *
 * Usage: node scripts/generate-ambient-audio.js
 */

const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050;
const DURATION_SEC = 30;
const TOTAL_SAMPLES = SAMPLE_RATE * DURATION_SEC;
const FADE_SAMPLES = Math.floor(SAMPLE_RATE * 0.05); // 50ms crossfade for seamless looping

// ─── WAV writer ────────────────────────────────────────────
function writeWav(filePath, channels, sampleRate, samples) {
  const numChannels = channels;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * 2; // 16-bit = 2 bytes per sample
  const fileSize = 36 + dataSize;

  const buf = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buf.write("RIFF", offset); offset += 4;
  buf.writeUInt32LE(fileSize, offset); offset += 4;
  buf.write("WAVE", offset); offset += 4;

  // fmt chunk
  buf.write("fmt ", offset); offset += 4;
  buf.writeUInt32LE(16, offset); offset += 4; // chunk size
  buf.writeUInt16LE(1, offset); offset += 2;  // PCM
  buf.writeUInt16LE(numChannels, offset); offset += 2;
  buf.writeUInt32LE(sampleRate, offset); offset += 4;
  buf.writeUInt32LE(byteRate, offset); offset += 4;
  buf.writeUInt16LE(blockAlign, offset); offset += 2;
  buf.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buf.write("data", offset); offset += 4;
  buf.writeUInt32LE(dataSize, offset); offset += 4;

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const val = Math.round(clamped * 32767);
    buf.writeInt16LE(val, offset); offset += 2;
  }

  fs.writeFileSync(filePath, buf);
  const sizeKB = Math.round(buf.length / 1024);
  console.log(`  → ${path.basename(filePath)} (${sizeKB} KB, ${channels}ch, ${sampleRate}Hz, ${DURATION_SEC}s)`);
}

// ─── Binaural theta tone ───────────────────────────────────
// Left ear: 200 Hz carrier, Right ear: 206 Hz carrier
// Difference = 6 Hz → theta-range binaural beat
// Gentle amplitude to sit under voice at 20% mix
function generateBinauralTheta() {
  console.log("Generating binaural theta tone...");
  const freqL = 200;
  const freqR = 206;
  const amplitude = 0.35; // moderate — will be further reduced by 20% ambient mix

  // Interleaved stereo: [L0, R0, L1, R1, ...]
  const samples = new Float64Array(TOTAL_SAMPLES * 2);

  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    let left = Math.sin(2 * Math.PI * freqL * t) * amplitude;
    let right = Math.sin(2 * Math.PI * freqR * t) * amplitude;

    // Crossfade at boundaries for seamless looping
    if (i < FADE_SAMPLES) {
      const fade = i / FADE_SAMPLES;
      left *= fade;
      right *= fade;
    } else if (i > TOTAL_SAMPLES - FADE_SAMPLES) {
      const fade = (TOTAL_SAMPLES - i) / FADE_SAMPLES;
      left *= fade;
      right *= fade;
    }

    samples[i * 2] = left;
    samples[i * 2 + 1] = right;
  }

  const outPath = path.join(__dirname, "..", "assets", "audio", "ambient-theta.wav");
  writeWav(outPath, 2, SAMPLE_RATE, samples);
}

// ─── Pink noise ────────────────────────────────────────────
// Voss-McCartney algorithm for 1/f noise — sounds like soft rain / ocean wash.
// Mono, gentle amplitude.
function generatePinkNoise() {
  console.log("Generating pink noise...");

  // Voss-McCartney: sum of octave-band sample-and-hold white noise sources
  const NUM_SOURCES = 12;
  const values = new Float64Array(NUM_SOURCES);
  const amplitude = 0.30;

  // Seed each source
  for (let j = 0; j < NUM_SOURCES; j++) {
    values[j] = (Math.random() * 2 - 1);
  }

  const samples = new Float64Array(TOTAL_SAMPLES);
  let runningSum = 0;
  for (let j = 0; j < NUM_SOURCES; j++) runningSum += values[j];

  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    // Determine which sources to update (bit-reversal pattern)
    let changed = i ^ (i - 1);
    for (let j = 0; j < NUM_SOURCES; j++) {
      if (changed & (1 << j)) {
        runningSum -= values[j];
        values[j] = (Math.random() * 2 - 1);
        runningSum += values[j];
      }
    }

    // Add a white noise component for high-frequency content
    const white = (Math.random() * 2 - 1);
    let sample = (runningSum + white) / (NUM_SOURCES + 1);
    sample *= amplitude;

    // Crossfade at boundaries for seamless looping
    if (i < FADE_SAMPLES) {
      sample *= i / FADE_SAMPLES;
    } else if (i > TOTAL_SAMPLES - FADE_SAMPLES) {
      sample *= (TOTAL_SAMPLES - i) / FADE_SAMPLES;
    }

    samples[i] = sample;
  }

  const outPath = path.join(__dirname, "..", "assets", "audio", "ambient-noise.wav");
  writeWav(outPath, 1, SAMPLE_RATE, samples);
}

// ─── Main ──────────────────────────────────────────────────
console.log("Generating Que ambient audio files...\n");
generateBinauralTheta();
generatePinkNoise();
console.log("\nDone.");
