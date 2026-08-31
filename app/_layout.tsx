import { useCallback, useEffect, useRef, useState } from "react";
import { F, S } from "@/lib/fonts";
import { Alert, Text, TextInput, Pressable, Platform, LogBox, StyleSheet } from "react-native";

// view-shot's native half ships with the next dev build; hide its
// missing-module warning until then.
LogBox.ignoreLogs(["react-native-view-shot"]);
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Glass } from "@/components/Glass";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "@/lib/auth";
import { BackdropProvider } from "@/lib/backdrop";
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
      shouldShowBanner: true,
      shouldShowList: true,
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
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const receivedListener = useRef<Notifications.Subscription | undefined>(undefined);

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

// ─── The split glass nav ─────────────────────────────────
// A full-width translucent bar still reads as chrome: one slab pinned to
// the top of the screen. Liquid glass wants objects, so the nav is broken
// into three separate pieces that float over whatever backdrop the screen
// is running — a round control on the left, a pill holding the title, a
// round control on the right when the screen has an action. Each piece
// carries its own sheen at a different phase so they catch the light one
// after another rather than blinking together.
const NAV_PHASE = { left: 0, title: 0.34, right: 0.68 };

export function NavGlassButton({
  icon,
  onPress,
  label,
  phase = NAV_PHASE.left,
  disabled = false,
  iconSize = 22,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  phase?: number;
  disabled?: boolean;
  iconSize?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        navStyles.controlWrap,
        pressed && { transform: [{ scale: 0.94 }], opacity: 0.9 },
      ]}
    >
      <Glass liquid phase={phase} intensity={1.15} scrim="soft" style={navStyles.control}>
        <Ionicons
          name={icon}
          size={iconSize}
          color={disabled ? "rgba(245,245,247,0.35)" : "#ffffff"}
        />
      </Glass>
    </Pressable>
  );
}

export function NavGlassTitle({
  children,
  serif = false,
}: {
  children?: React.ReactNode;
  serif?: boolean;
}) {
  return (
    <Glass liquid phase={NAV_PHASE.title} intensity={0.95} scrim="soft" style={navStyles.pill}>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[navStyles.pillText, serif && navStyles.pillSerif]}
      >
        {children}
      </Text>
    </Glass>
  );
}

const navStyles = StyleSheet.create({
  controlWrap: {
    marginHorizontal: 12,
  },
  control: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    borderRadius: 20,
    overflow: "hidden",
    maxWidth: 230,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
  pillSerif: {
    fontFamily: "Lora",
    fontSize: S.title,
    fontWeight: "400",
  },
});

// Back control for the stack screens — same glass piece the drawer uses,
// so travelling between the two navigators never changes the nav's shape.
function StackBackButton() {
  const router = useRouter();
  return <NavGlassButton icon="chevron-back" label="Go back" onPress={() => router.back()} />;
}

// ─── Shared header config ────────────────────────────────
// No bar at all: transparent, no background element, three glass pieces.
const HEADER_BASE = {
  headerTransparent: true,
  headerBackground: () => null,
  headerStyle: { backgroundColor: "transparent" },
  headerTintColor: "#f5f5f7",
  headerShadowVisible: false,
  headerTitleAlign: "center",
  headerLeft: () => <StackBackButton />,
  headerTitle: ({ children }: { children: string }) => <NavGlassTitle>{children}</NavGlassTitle>,
  // Chevron only — never the previous screen's route name
  headerBackButtonDisplayMode: "minimal",
} as const;

// How far a screen's content has to start below the floating nav. The
// header is absolutely positioned now, so every screen that isn't drawing
// its own full-bleed backdrop needs this as padding.
const NAV_BAR_HEIGHT = Platform.OS === "ios" ? 44 : 56;

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  // Screens that paint their own full-bleed backdrop (aurora, artwork) run
  // edge to edge under the floating nav and pad themselves. Everything else
  // gets pushed down to clear it.
  const navTop = insets.top + NAV_BAR_HEIGHT + 8;

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
      <BackdropProvider>
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
            name="glass-lab"
            options={{ headerShown: false, animation: "fade" }}
          />
          <Stack.Screen
            name="goodnight"
            options={{
              headerShown: false,
              animation: "fade",
              gestureEnabled: true,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="background-picker"
            options={{
              animation: "fade",
              headerShown: true,
              title: "Background",
              headerBackTitle: "",
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#020805" },
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              animation: "fade",
              headerShown: true,
              title: "Settings",
              headerBackTitle: "",
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="edit-profile"
            options={{
              animation: "fade",
              headerShown: true,
              title: "Edit Profile",
              headerBackTitle: "",
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000", paddingTop: navTop },
            }}
          />
          <Stack.Screen
            name="edit-email"
            options={{
              animation: "fade",
              headerShown: true,
              title: "Email",
              headerBackTitle: "",
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000", paddingTop: navTop },
            }}
          />
          <Stack.Screen
            name="alarm-config"
            options={{
              animation: "fade",
              headerShown: true,
              headerBackTitle: "",
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#020805" },
            }}
          />
          <Stack.Screen
            name="edit-alarm"
            options={{
              animation: "fade",
              headerShown: true,
              headerBackTitle: "",
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000", paddingTop: navTop },
            }}
          />
          <Stack.Screen
            name="sounds"
            options={{
              animation: "fade",
              headerShown: true,
              title: "Sounds",
              headerBackTitle: "",
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#020805", paddingTop: navTop },
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
              animation: "fade",
              headerShown: false,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="habit-add"
            options={{
              animation: "fade",
              headerShown: true,
              title: "New Habit",
              headerBackTitle: "",
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
          <Stack.Screen
            name="alarm-debug"
            options={{
              animation: "fade",
              headerShown: true,
              title: "Alarm Debug",
              headerBackTitle: "",
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000", paddingTop: navTop },
            }}
          />
        </Stack>
      </GestureHandlerRootView>
      </BackdropProvider>
    </AuthProvider>
  );
}
