import { useCallback, useEffect, useRef, useState } from "react";
import { F, S } from "@/lib/fonts";
import { Alert, Text, TextInput, Pressable, Platform, LogBox } from "react-native";

// view-shot's native half ships with the next dev build; hide its
// missing-module warning until then.
LogBox.ignoreLogs(["react-native-view-shot"]);
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "@/lib/auth";
import { requestAlarmPermissions, ensureAndroidChannel } from "@/lib/alarmScheduler";
import { initBackgroundAudio } from "@/lib/backgroundAudio";
import { WELCOME_COUNT_KEY, WELCOME_MAX_SHOWS } from "./welcome";

SplashScreen.preventAutoHideAsync();

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
      shouldPlaySound: isAlarm,
      shouldSetBadge: false,
    };
  },
});

const applyDefaultFont = (Component: any) => {
  Component.defaultProps = Component.defaultProps || {};
  const existing = Component.defaultProps.style;
  Component.defaultProps.style = [
    { fontFamily: F.regular },
    existing,
  ];
};
applyDefaultFont(Text);
applyDefaultFont(TextInput);

// ─── Notification listener setup ─────────────────────────
// Handles tapping on a fired alarm notification → navigate to player.
function NotificationGate() {
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription>();
  const receivedListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Permissions + Android channel on every app launch
    requestAlarmPermissions();
    ensureAndroidChannel();

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
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type !== "alarm") return;
        const sessionId = data?.sessionId as string | undefined;
        if (sessionId) {
          // Small delay to let the navigator mount after cold start
          setTimeout(() => router.push(`/player?id=${sessionId}&alarm=1` as any), 300);
        }
      }
    );

    return () => {
      receivedListener.current?.remove();
      responseListener.current?.remove();
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

// Back button aligned with the drawer screens' hamburger (16pt inset) —
// the native chevron hugs the edge too tightly.
function HeaderBackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={{ marginLeft: Platform.OS === "ios" ? 4 : 0, padding: 4 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={26} color="#f5f5f7" />
    </Pressable>
  );
}

// ─── Shared header config ────────────────────────────────
const HEADER_BASE = {
  headerStyle: { backgroundColor: "#000000" },
  headerTintColor: "#f5f5f7",
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: F.semibold, fontSize: S.body },
} as const;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Switzer-Light": require("../assets/fonts/Switzer-Light.otf"),
    "Switzer-Regular": require("../assets/fonts/Switzer-Regular.otf"),
    "Switzer-Medium": require("../assets/fonts/Switzer-Medium.otf"),
    "Switzer-Semibold": require("../assets/fonts/Switzer-Semibold.otf"),
    "Switzer-Bold": require("../assets/fonts/Switzer-Bold.otf"),
    "Lora": require("../assets/fonts/Lora-Variable.ttf"),
  });

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: "#000000" }}
        onLayout={onLayoutReady}
      >
        <StatusBar style="light" />
        <AuthGate />
        <NotificationGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="auth"
            options={{
              headerShown: false,
              animation: "none",
              contentStyle: { backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="onboarding"
            options={{
              headerShown: false,
              animation: "fade",
              gestureEnabled: false,
              contentStyle: { backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="(drawer)"
            options={{ contentStyle: { flex: 1, backgroundColor: "#000000" } }}
          />
          <Stack.Screen
            name="settings"
            options={{
              animation: "default",
              headerShown: true,
              title: "Settings",
              headerBackTitle: "",
              headerBackTitleVisible: false,
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="edit-profile"
            options={{
              animation: "default",
              headerShown: true,
              title: "Edit Profile",
              headerBackTitle: "",
              headerBackTitleVisible: false,
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="edit-email"
            options={{
              animation: "default",
              headerShown: true,
              title: "Email",
              headerBackTitle: "",
              headerBackTitleVisible: false,
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="edit-alarm"
            options={{
              animation: "default",
              headerShown: true,
              headerBackTitle: "",
              headerBackTitleVisible: false,
              headerLeft: () => <HeaderBackButton />,
              ...HEADER_BASE,
            }}
          />
          <Stack.Screen
            name="sounds"
            options={{
              animation: "default",
              headerShown: true,
              title: "Sounds",
              headerBackTitle: "",
              headerBackTitleVisible: false,
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="paywall"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
              headerShown: false,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="intro"
            options={{
              animation: "fade",
              headerShown: false,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="welcome"
            options={{
              animation: "fade",
              headerShown: false,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="player"
            options={{
              animation: "slide_from_right",
              headerShown: false,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="habit-track"
            options={{
              animation: "slide_from_right",
              headerShown: true,
              title: "Track",
              headerBackTitle: "",
              headerBackTitleVisible: false,
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="habit-add"
            options={{
              animation: "slide_from_right",
              headerShown: true,
              title: "Add Habit",
              headerBackTitle: "",
              headerBackTitleVisible: false,
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="gratitude"
            options={{
              animation: "slide_from_right",
              headerShown: true,
              title: "Gratitude",
              headerBackTitle: "",
              headerBackTitleVisible: false,
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="alarm-debug"
            options={{
              animation: "slide_from_right",
              headerShown: true,
              title: "Alarm Debug",
              headerBackTitle: "",
              headerBackTitleVisible: false,
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
