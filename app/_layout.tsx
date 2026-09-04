import { useEffect, useRef, useState } from "react";
import { Alert, AppState, LogBox } from "react-native";

// view-shot's native half ships with the next dev build; hide its
// missing-module warning until then.
LogBox.ignoreLogs(["react-native-view-shot"]);
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "@/lib/auth";
import { requestAlarmPermissions, ensureAndroidChannel, cancelBackupNotifications } from "@/lib/alarmScheduler";
import { consumeDueAlarm, markLaunched } from "@/lib/alarmLaunch";
import { initBackgroundAudio } from "@/lib/backgroundAudio";
import { loadVolume } from "@/lib/audio";
import { STACK, BARE, SHEET } from "@/lib/nav";
import { C } from "@/lib/tokens";
import { WELCOME_COUNT_KEY, WELCOME_MAX_SHOWS } from "./welcome";

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true });

// Initialize background audio as early as possible so iOS allocates the
// correct audio session category before any playback begins. Module scope
// so it runs once on cold start, before the React tree mounts.
initBackgroundAudio().catch(() => {});

// ─── Notification handler (module-level, before any render) ──
// This controls how notifications behave when the app is FOREGROUNDED.
// Must be set before any notification can fire.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isAlarm = notification.request.content.data?.type === "alarm";
    return {
      // Show a banner even when the app is open, so the user sees the alarm
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: isAlarm,
      shouldSetBadge: false,
    };
  },
});

// ─── Notification listener setup ─────────────────────────
// Handles tapping on a fired alarm notification → navigate to player.
function NotificationGate() {
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const receivedListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Permissions + Android channel on every app launch
    requestAlarmPermissions();
    ensureAndroidChannel();
    loadVolume();

    // Foreground notification received — show an in-app alert for alarms
    receivedListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        if (data?.type !== "alarm") return;
        const sessionId = data?.sessionId as string | undefined;
        Alert.alert(
          notification.request.content.title ?? "Alarm",
          notification.request.content.body ?? "",
          [
            { text: "Dismiss", style: "cancel" },
            {
              text: "Start Session",
              onPress: () => {
                if (sessionId) router.push(`/player?id=${sessionId}&alarm=1` as any);
              },
            },
          ]
        );
      }
    );

    // Notification tapped (app was backgrounded or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data;
        if (data?.type !== "alarm") return;
        const sessionId = data?.sessionId as string | undefined;
        const alarmId = data?.alarmId as string | undefined;
        if (!sessionId) return;
        if (alarmId) cancelBackupNotifications(alarmId);
        // The foreground check below may already have opened it.
        if (alarmId && !(await markLaunched(alarmId))) return;
        // Small delay to let the navigator mount after cold start
        setTimeout(() => router.push(`/player?id=${sessionId}&alarm=1` as any), 300);
      }
    );

    // A native (AlarmKit) alarm rings without the app running. When the
    // phone is unlocked into Morning Que shortly after one was due, go
    // straight to that alarm's session and silence the backup chimes.
    // Runs on launch and on every return to the foreground; each alarm
    // opens at most once a day.
    const openDueAlarm = async () => {
      const due = await consumeDueAlarm();
      if (!due) return;
      cancelBackupNotifications(due.alarmId);
      setTimeout(() => router.push(`/player?id=${due.sessionId}&alarm=1` as any), 300);
    };
    openDueAlarm();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") openDueAlarm();
    });

    return () => {
      receivedListener.current?.remove();
      responseListener.current?.remove();
      appState.remove();
    };
  }, []);

  return null;
}

// ─── Auth-gated routing ──────────────────────────────────
// The welcome screen (landing-page hero + one Enter tap) is the front
// door. It shows on every open until a session exists, and for the
// first WELCOME_MAX_SHOWS opens after that. Home base is /alarms.
let welcomeShownThisLaunch = false;

function AuthGate() {
  const { session, user, isGuest, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [welcomeCount, setWelcomeCount] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_COUNT_KEY)
      .then((raw) => setWelcomeCount(parseInt(raw ?? "0", 10) || 0))
      .catch(() => setWelcomeCount(WELCOME_MAX_SHOWS));
  }, []);

  useEffect(() => {
    if (loading || welcomeCount === null) return;

    const onAuthScreen = segments[0] === "auth";
    const onOnboarding = segments[0] === "onboarding";
    const onWelcome = segments[0] === "welcome";

    if (!session && !isGuest) {
      // No account yet → the welcome screen is the entry point.
      // (Its Enter button starts a guest session; Log in goes to /auth.)
      if (!onAuthScreen && !onWelcome) {
        welcomeShownThisLaunch = true;
        router.replace("/welcome" as any);
      }
      return;
    }

    // Signed in — replay the welcome moment for the first few opens
    if (
      !welcomeShownThisLaunch &&
      welcomeCount < WELCOME_MAX_SHOWS &&
      !onWelcome &&
      !onOnboarding
    ) {
      welcomeShownThisLaunch = true;
      router.replace("/welcome" as any);
      return;
    }

    if (onWelcome) return; // Enter button handles leaving

    // Guests skip onboarding entirely — home base is the alarms list
    const onboarded = isGuest || user?.user_metadata?.onboarded === true;

    if (!onboarded && !onOnboarding) {
      // First-time user → send to onboarding
      router.replace("/onboarding" as any);
    } else if (onboarded && (onAuthScreen || onOnboarding)) {
      // Returning user who somehow landed on auth/onboarding → send home
      router.replace("/alarms");
    }
  }, [session, user, isGuest, loading, segments, welcomeCount]);

  return null;
}

// ─── Root ────────────────────────────────────────────────
// No custom fonts: the system font is the point (see lib/tokens.ts), so
// there is nothing to wait for before the splash comes down.
export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style="light" />
        <AuthGate />
        <NotificationGate />
        <Stack screenOptions={STACK}>
          {/* Entry */}
          <Stack.Screen name="index" options={BARE} />
          <Stack.Screen name="welcome" options={{ ...BARE, animation: "fade" }} />
          <Stack.Screen name="intro" options={{ ...BARE, animation: "fade" }} />
          <Stack.Screen name="onboarding" options={{ ...BARE, animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="auth" options={{ ...BARE, animation: "none" }} />

          {/* Home */}
          <Stack.Screen name="(tabs)" options={BARE} />

          {/* Full-screen surfaces */}
          {/* Now Playing rises over the tabs like Music's, and swipes back down. */}
          <Stack.Screen
            name="player"
            options={{ ...BARE, presentation: "fullScreenModal", animation: "slide_from_bottom", gestureEnabled: true }}
          />
          <Stack.Screen
            name="goodnight"
            options={{ ...BARE, presentation: "fullScreenModal", animation: "slide_from_bottom", gestureEnabled: true }}
          />
          <Stack.Screen name="paywall" options={{ ...BARE, presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="score-info" options={{ ...BARE, presentation: "modal", animation: "slide_from_bottom" }} />

          {/* Editors present as sheets */}
          <Stack.Screen name="alarm-config" options={SHEET} />
          <Stack.Screen name="habit-add" options={{ ...SHEET, title: "New Habit" }} />

          {/* Pushed pages */}
          <Stack.Screen name="sounds" options={{ title: "Choose Sound" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen name="edit-profile" options={{ title: "Profile" }} />
          <Stack.Screen name="edit-email" options={{ title: "Email" }} />
          <Stack.Screen name="ambient-picker" options={{ title: "Ambient Sound" }} />
          <Stack.Screen name="haptic-picker" options={{ title: "Haptics" }} />
          <Stack.Screen name="alarm-debug" options={{ title: "Alarm Diagnostics" }} />
        </Stack>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
