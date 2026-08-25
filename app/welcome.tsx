import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Svg, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { F } from "@/lib/fonts";
import { ensureGuestSession } from "@/lib/guestAuth";
import { useAuth } from "@/lib/auth";

// Same hero footage the morningque.netlify.app landing page streams.
// Portrait-first for phones; falls back to plain black if offline.
const HERO_VIDEOS = [
  "https://videos.pexels.com/video-files/17634301/17634301-uhd_1440_2560_30fps.mp4",
  "https://videos.pexels.com/video-files/20614908/20614908-uhd_2560_1440_60fps.mp4",
];

export const WELCOME_COUNT_KEY = "welcome_shown_count";
export const WELCOME_MAX_SHOWS = 3;

export default function WelcomeScreen() {
  const router = useRouter();
  const { enterAsGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const [entering, setEntering] = useState(false);
  const [videoIndex] = useState(() => Math.floor(Math.random() * HERO_VIDEOS.length));
  const countedRef = useRef(false);

  useEffect(() => {
    if (countedRef.current) return;
    countedRef.current = true;
    AsyncStorage.getItem(WELCOME_COUNT_KEY).then((raw) => {
      const n = parseInt(raw ?? "0", 10) || 0;
      AsyncStorage.setItem(WELCOME_COUNT_KEY, String(n + 1)).catch(() => {});
    });
  }, []);

  const handleEnter = async () => {
    if (entering) return;
    setEntering(true);
    // Prefer a server-side anonymous session (syncs across devices);
    // fall back to on-device guest mode so Enter ALWAYS gets you in.
    const result = await ensureGuestSession();
    if (!result.ok) {
      await enterAsGuest();
    }
    router.replace("/alarms");
  };

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: HERO_VIDEOS[videoIndex] }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />

      {/* Scrim — darkens footage so the type reads, like the site's hero */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#000000" stopOpacity="0.55" />
              <Stop offset="45%" stopColor="#000000" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.82" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
        </Svg>
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 18, paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
        <Text style={styles.wordmark} maxFontSizeMultiplier={1.2}>
          Morning Que
        </Text>

        <View style={styles.heroBlock}>
          <Text style={styles.headline} maxFontSizeMultiplier={1.2}>
            Fall in love with your mornings.
          </Text>
        </View>

        <View>
          <Pressable
            style={styles.enterButton}
            onPress={handleEnter}
            disabled={entering}
            accessibilityRole="button"
            accessibilityLabel="Enter Morning Que"
            accessibilityState={{ disabled: entering }}
          >
            {entering ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <Text style={styles.enterText} maxFontSizeMultiplier={1.2}>Enter</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.loginLink}
            onPress={() => router.push("/auth")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Log in to an existing account"
          >
            <Text style={styles.loginText}>Have an account? Log in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  wordmark: {
    fontFamily: "Lora",
    fontSize: 22,
    color: "#f5f5f7",
    textAlign: "center",
  },
  heroBlock: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 36,
  },
  headline: {
    fontFamily: "Lora",
    fontSize: 44,
    lineHeight: 52,
    color: "#f5f5f7",
  },
  enterButton: {
    backgroundColor: "#f5f5f7",
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  enterText: {
    color: "#0a0a0a",
    fontSize: 17,
    fontFamily: F.semibold,
    letterSpacing: 0.3,
  },
  loginLink: {
    alignItems: "center",
    paddingTop: 16,
  },
  loginText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: F.regular,
  },
});
