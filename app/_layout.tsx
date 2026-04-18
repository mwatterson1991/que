import { useCallback, useEffect, useState } from "react";
import { Text, TextInput } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/lib/auth";
import { initNotifications } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

const applyDefaultFont = (Component: any) => {
  Component.defaultProps = Component.defaultProps || {};
  const existing = Component.defaultProps.style;
  Component.defaultProps.style = [
    { fontFamily: "Switzer-Regular" },
    existing,
  ];
};
applyDefaultFont(Text);
applyDefaultFont(TextInput);

// ─── Notification setup (runs once at app start) ────────
function NotificationInit() {
  useEffect(() => {
    initNotifications();
  }, []);
  return null;
}

// ─── Auth-gated routing ──────────────────────────────────
function AuthGate() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [initialRouted, setInitialRouted] = useState(false);

  useEffect(() => {
    if (loading) return;

    const onAuthScreen = segments[0] === "auth";

    if (!session && !onAuthScreen) {
      // Not logged in and not on auth → send to auth
      router.replace("/auth");
    } else if (session && onAuthScreen) {
      // Logged in but still on auth → send to app
      router.replace("/");
    }

    if (!initialRouted) setInitialRouted(true);
  }, [session, loading, segments]);

  return null;
}

// ─── Shared header config ────────────────────────────────
const HEADER_BASE = {
  headerStyle: { backgroundColor: "#0b0b0f" },
  headerTintColor: "#f5f5f7",
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: "Switzer-Semibold", fontSize: 17 },
} as const;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Switzer-Thin": require("../assets/fonts/Switzer-Thin.otf"),
    "Switzer-Extralight": require("../assets/fonts/Switzer-Extralight.otf"),
    "Switzer-Light": require("../assets/fonts/Switzer-Light.otf"),
    "Switzer-Regular": require("../assets/fonts/Switzer-Regular.otf"),
    "Switzer-Medium": require("../assets/fonts/Switzer-Medium.otf"),
    "Switzer-Semibold": require("../assets/fonts/Switzer-Semibold.otf"),
    "Switzer-Bold": require("../assets/fonts/Switzer-Bold.otf"),
    "Switzer-Extrabold": require("../assets/fonts/Switzer-Extrabold.otf"),
    "Switzer-Black": require("../assets/fonts/Switzer-Black.otf"),
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
        <NotificationInit />
        <AuthGate />
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
            name="(drawer)"
            options={{ contentStyle: { flex: 1, backgroundColor: "#000000" } }}
          />
          <Stack.Screen
            name="profile-page"
            options={{
              animation: "default",
              headerShown: true,
              title: "Profile",
              ...HEADER_BASE,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
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
              contentStyle: { flex: 1, backgroundColor: "#0b0b0f" },
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
              contentStyle: { flex: 1, backgroundColor: "#0b0b0f" },
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
              contentStyle: { flex: 1, backgroundColor: "#0b0b0f" },
            }}
          />
          <Stack.Screen
            name="edit-alarm"
            options={{
              animation: "default",
              headerShown: true,
              headerBackTitle: "",
              headerBackTitleVisible: false,
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
            name="player"
            options={{
              animation: "slide_from_right",
              headerShown: false,
              contentStyle: { flex: 1, backgroundColor: "#000000" },
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
