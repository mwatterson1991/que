import * as FileSystem from "expo-file-system";

// ─── Config ────────────────────────────────────────────────
const API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? "";
const BASE_URL = "https://api.elevenlabs.io/v1";

// Default voice — "Rachel" (calm, neutral). Override per-call or change here.
export const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;         // e.g. "eleven_turbo_v2" for fast generation
  stability?: number;       // 0–1, default 0.5
  similarityBoost?: number; // 0–1, default 0.75
  style?: number;           // 0–1, default 0
  speakerBoost?: boolean;
}

// ─── Synthesize speech → local file URI ────────────────────
/**
 * Calls ElevenLabs TTS, writes the audio to a temp cache file,
 * and returns a file:// URI that expo-av can play directly.
 */
export async function synthesizeSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<string> {
  const {
    voiceId = DEFAULT_VOICE_ID,
    modelId = "eleven_turbo_v2",
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0,
    speakerBoost = true,
  } = options;

  if (!API_KEY) {
    throw new Error(
      "[elevenlabs] EXPO_PUBLIC_ELEVENLABS_API_KEY is not set. Check your .env file."
    );
  }

  const url = `${BASE_URL}/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: speakerBoost,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[elevenlabs] API error ${response.status}: ${errorText}`
    );
  }

  // Write the audio bytes to a temp cache file
  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  const cacheDir = FileSystem.cacheDirectory ?? "";
  const fileName = `tts_${Date.now()}.mp3`;
  const filePath = `${cacheDir}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return filePath; // pass this URI to playSession({ type: "url", uri: filePath })
}

// ─── List available voices ──────────────────────────────────
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url: string | null;
}

export async function listVoices(): Promise<ElevenLabsVoice[]> {
  const response = await fetch(`${BASE_URL}/voices`, {
    headers: { "xi-api-key": API_KEY },
  });

  if (!response.ok) {
    throw new Error(`[elevenlabs] Failed to fetch voices: ${response.status}`);
  }

  const data = await response.json();
  return data.voices as ElevenLabsVoice[];
}

// ─── Helpers ────────────────────────────────────────────────
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
