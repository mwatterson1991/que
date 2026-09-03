import { useState, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen, Txt, Button } from "@/components/ui";
import { C, SP } from "@/lib/tokens";
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
  const { top, bottom } = useSafeAreaInsets();
  const [entering, setEntering] = useState(false);
  const [videoIndex] = useState(() => Math.floor(Math.random() * HERO_VIDEOS.length));
  const countedRef = useRef(false);

  // Autoplaying, looping, muted hero footage
  const heroPlayer = useVideoPlayer(HERO_VIDEOS[videoIndex], (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

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
    // First time through, show the three-step pitch
    const seen = await AsyncStorage.getItem("intro_seen").catch(() => "1");
    if (!seen) {
      AsyncStorage.setItem("intro_seen", "1").catch(() => {});
      router.replace("/intro" as any);
    } else {
      router.replace("/alarms");
    }
  };

  return (
    <Screen>
      {/* Full-bleed hero footage */}
      <VideoView
        player={heroPlayer}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      <View style={[styles.wordmark, { paddingTop: top + SP.lg }]} pointerEvents="none">
        <Txt kind="footnote" tone="secondary" maxFontSizeMultiplier={1.2}>
          MORNING QUE
        </Txt>
      </View>

      {/* Copy and the one action sit on a flat scrim at the foot of the footage */}
      <View style={[styles.foot, { paddingBottom: bottom + SP.xl }]}>
        <Txt kind="editorial" maxFontSizeMultiplier={1.2} style={styles.headline}>
          Fall in love with your mornings.
        </Txt>

        <Button
          title={entering ? "Entering…" : "Enter"}
          onPress={handleEnter}
          disabled={entering}
          accessibilityLabel="Enter Morning Que"
        />
        <Button
          title="Have an account? Log in"
          tone="plain"
          onPress={() => router.push("/auth")}
          accessibilityLabel="Log in to an existing account"
          style={styles.login}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    alignItems: "center",
  },
  foot: {
    marginTop: "auto",
    paddingHorizontal: SP.screen,
    paddingTop: SP.xxl,
    backgroundColor: C.scrim,
  },
  headline: {
    marginBottom: SP.xxl,
  },
  login: {
    marginTop: SP.xs,
  },
});
