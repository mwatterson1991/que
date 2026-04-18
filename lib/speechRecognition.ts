let mod: any = null;
try {
  mod = require("expo-speech-recognition");
} catch {}

type Listener = (e: any) => void;

const stubModule = {
  requestPermissionsAsync: async () => ({ granted: false }),
  start: (_opts?: any) => {
    console.warn("[speech] native module unavailable in this build");
  },
  stop: () => {},
};

export const ExpoSpeechRecognitionModule =
  mod?.ExpoSpeechRecognitionModule ?? stubModule;

export const useSpeechRecognitionEvent: (
  event: string,
  listener: Listener
) => void = mod?.useSpeechRecognitionEvent ?? (() => {});

export const isSpeechRecognitionAvailable = !!mod?.ExpoSpeechRecognitionModule;
