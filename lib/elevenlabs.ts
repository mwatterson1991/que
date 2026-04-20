/**
 * ElevenLabs text-to-speech client.
 *
 * Uses fetch() so it works in both React Native (premium custom sessions)
 * and Node ≥18 (batch generation script).
 */

const API_BASE = "https://api.elevenlabs.io/v1";

export type ElevenLabsConfig = {
  apiKey: string;
  /** ElevenLabs voice ID — find yours at https://elevenlabs.io/voice-library */
  voiceId: string;
};

export type TTSOptions = {
  /** Model to use. "eleven_multilingual_v2" is recommended for quality. */
  modelId?: string;
  /** Stability — lower = more expressive, higher = more consistent. 0–1. */
  stability?: number;
  /** Similarity boost — higher = closer to the original voice. 0–1. */
  similarityBoost?: number;
  /** Style exaggeration. 0–1. Only on v2 models. */
  style?: number;
  /** Output format. Default: "mp3_44100_128" */
  outputFormat?: string;
};

const DEFAULT_OPTIONS: Required<TTSOptions> = {
  modelId: "eleven_multilingual_v2",
  stability: 0.55,
  similarityBoost: 0.78,
  style: 0.15,
  outputFormat: "mp3_44100_128",
};

/**
 * Convert text to speech via ElevenLabs API.
 * Returns raw audio bytes as an ArrayBuffer.
 */
export async function textToSpeech(
  config: ElevenLabsConfig,
  text: string,
  options?: TTSOptions,
): Promise<ArrayBuffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const url = `${API_BASE}/text-to-speech/${config.voiceId}?output_format=${opts.outputFormat}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": config.apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: opts.modelId,
      voice_settings: {
        stability: opts.stability,
        similarity_boost: opts.similarityBoost,
        style: opts.style,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs API error ${response.status}: ${errorBody || response.statusText}`,
    );
  }

  return response.arrayBuffer();
}

/**
 * Personalize a script template by replacing {{name}} tokens.
 */
export function personalizeScript(template: string, name: string): string {
  return template.replace(/\{\{name\}\}/g, name);
}
