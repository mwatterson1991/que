#!/usr/bin/env node

/**
 * Que — Batch audio generation pipeline
 *
 * Reads hypnotherapy scripts from content/scripts/, converts each to audio
 * via ElevenLabs TTS, uploads to Supabase storage, and upserts session
 * records in the database.
 *
 * Prerequisites:
 *   - content/scripts/manifest.json must exist (PR #25)
 *   - .env must contain ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID,
 *     SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/generate-audio.mjs
 *   node scripts/generate-audio.mjs --dry-run      # preview without API calls
 *   node scripts/generate-audio.mjs --only deep-focus-flow-state  # single script
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Deterministic UUID from a script slug so upserts stay idempotent
// (sessions.id is uuid; the manifest uses human slugs).
function slugToUuid(slug) {
  const h = createHash("sha1").update("morningque:" + slug).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SCRIPTS_DIR = resolve(ROOT, "content/scripts");
const MANIFEST_PATH = resolve(SCRIPTS_DIR, "manifest.json");

// ─── Load .env manually (no dotenv dependency) ─────────────
function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) {
    console.error("ERROR: .env file not found. Copy .env.example and fill in your keys.");
    process.exit(1);
  }
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

// ─── Validate required env vars ────────────────────────────
const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY || process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
// Default: "Rachel" — matches DEFAULT_VOICE_ID in lib/elevenlabs.ts
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DRY_RUN = process.argv.includes("--dry-run");
// --local-only: generate + cache MP3s without uploading to Supabase
// (no SUPABASE_SERVICE_ROLE_KEY needed). Re-running the full pipeline
// later reuses the cache, so no TTS credits are spent twice.
const LOCAL_ONLY = process.argv.includes("--local-only");
const CACHE_DIR = resolve(ROOT, "generated-audio");
const ONLY_ID = (() => {
  const idx = process.argv.indexOf("--only");
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

if (!DRY_RUN) {
  const missing = [];
  if (!ELEVENLABS_API_KEY) missing.push("ELEVENLABS_API_KEY");
  if (!LOCAL_ONLY) {
    if (!SUPABASE_URL) missing.push("SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)");
    if (!SUPABASE_SERVICE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (missing.length > 0) {
    console.error(`ERROR: Missing env vars: ${missing.join(", ")}`);
    console.error("Add them to .env — see .env.example for the full list.");
    if (!LOCAL_ONLY && !SUPABASE_SERVICE_KEY) {
      console.error("Tip: run with --local-only to generate audio without uploading.");
    }
    process.exit(1);
  }
}

// ─── ElevenLabs TTS ────────────────────────────────────────
const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

async function textToSpeech(text) {
  const url = `${ELEVENLABS_API}/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.78,
        style: 0.15,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${body || res.statusText}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

// ─── Supabase helpers ──────────────────────────────────────
async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status} ${path}: ${body}`);
  }
  return res;
}

async function uploadToStorage(bucket, filePath, audioBuffer) {
  await supabaseRequest(`/storage/v1/object/${bucket}/${filePath}`, {
    method: "POST",
    headers: {
      "Content-Type": "audio/mpeg",
      "x-upsert": "true",
    },
    body: audioBuffer,
  });

  // Return the public URL
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
}

async function upsertSession(session) {
  await supabaseRequest("/rest/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(session),
  });
}

// ─── Main pipeline ─────────────────────────────────────────
async function main() {
  console.log("Que Audio Generation Pipeline");
  console.log("─".repeat(40));

  if (DRY_RUN) {
    console.log("DRY RUN — no API calls will be made\n");
  }

  // Load manifest
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`ERROR: Manifest not found at ${MANIFEST_PATH}`);
    console.error("Make sure PR #25 (hypnotherapy scripts) is merged first.");
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  let scripts = manifest.scripts;

  if (ONLY_ID) {
    scripts = scripts.filter((s) => s.id === ONLY_ID);
    if (scripts.length === 0) {
      console.error(`ERROR: No script with id "${ONLY_ID}" found in manifest.`);
      process.exit(1);
    }
  }

  console.log(`Found ${scripts.length} script(s) to process.\n`);

  const STORAGE_BUCKET = "audio";
  let success = 0;
  let failed = 0;

  for (const entry of scripts) {
    const label = `[${entry.id}]`;
    console.log(`${label} ${entry.title} (${entry.category}, ${entry.tier})`);

    // Read script text
    const scriptPath = resolve(SCRIPTS_DIR, entry.file);
    if (!existsSync(scriptPath)) {
      console.log(`${label}   SKIP — script file not found: ${entry.file}`);
      failed++;
      continue;
    }

    let scriptText = readFileSync(scriptPath, "utf-8").trim();

    // Replace {{name}} with a generic name for the pre-generated library version.
    // Premium custom sessions will use the actual user's name at runtime.
    scriptText = scriptText.replace(/\{\{name\}\}/g, "friend");

    if (DRY_RUN) {
      console.log(`${label}   ${scriptText.length} chars, ~${entry.estimated_duration_sec}s`);
      console.log(`${label}   Would upload to: ${STORAGE_BUCKET}/sessions/${entry.id}.mp3`);
      success++;
      continue;
    }

    // Generate audio via ElevenLabs (or reuse local cache)
    try {
      const cachePath = resolve(CACHE_DIR, `${entry.id}.mp3`);
      let audioBuffer;
      if (existsSync(cachePath)) {
        audioBuffer = readFileSync(cachePath);
        console.log(`${label}   Using cached audio (${(audioBuffer.length / 1024 / 1024).toFixed(1)} MB)`);
      } else {
        console.log(`${label}   Generating audio (${scriptText.length} chars)...`);
        audioBuffer = await textToSpeech(scriptText);
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(cachePath, audioBuffer);
        console.log(`${label}   Audio generated: ${(audioBuffer.length / 1024 / 1024).toFixed(1)} MB (cached)`);
      }

      if (LOCAL_ONLY) {
        console.log(`${label}   Done (local only).\n`);
        success++;
        continue;
      }

      // Upload to Supabase storage
      const storagePath = `sessions/${entry.id}.mp3`;
      console.log(`${label}   Uploading to storage...`);
      const audioUrl = await uploadToStorage(STORAGE_BUCKET, storagePath, audioBuffer);
      console.log(`${label}   Uploaded: ${storagePath}`);

      // Build mantras array from script (extract short affirmation lines)
      const mantras = extractMantras(scriptText);

      // Upsert the session record
      console.log(`${label}   Upserting session record...`);
      await upsertSession({
        id: slugToUuid(entry.id),
        title: entry.title,
        description: entry.description,
        category: entry.category,
        tier: entry.tier ?? "free",
        narrator: "Brian",
        duration_sec: entry.estimated_duration_sec,
        audio_url: audioUrl,
        audio_asset: null,
        plays: 0,
        mantras,
      });

      console.log(`${label}   Done.\n`);
      success++;
    } catch (err) {
      console.error(`${label}   FAILED: ${err.message}\n`);
      failed++;
    }

    // Rate limit: ElevenLabs has per-minute limits on most plans
    if (!DRY_RUN && scripts.indexOf(entry) < scripts.length - 1) {
      console.log("   Waiting 3s (rate limit)...");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log("─".repeat(40));
  console.log(`Done. ${success} succeeded, ${failed} failed out of ${scripts.length} total.`);
}

/**
 * Extract short affirmation-style lines from a script to use as mantras
 * in the player teleprompter. Looks for sentences that feel like
 * affirmations or key phrases (short, declarative, present-tense).
 */
function extractMantras(scriptText) {
  const sentences = scriptText
    .split(/[.!]\s+/)
    .map((s) => s.replace(/\n/g, " ").trim())
    .filter((s) => s.length > 10 && s.length < 120);

  // Prefer sentences that start with "You", "I", "Your", or "Today"
  const affirmations = sentences.filter((s) =>
    /^(You |I |Your |Today |Every |This |Each |Right now)/i.test(s),
  );

  // Take up to 8 mantras, preferring affirmation-style sentences
  const picked = affirmations.length >= 5
    ? affirmations.slice(0, 8)
    : [...affirmations, ...sentences.filter((s) => !affirmations.includes(s))].slice(0, 8);

  return picked.map((s) => s.replace(/[.!,]$/, "").trim());
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
