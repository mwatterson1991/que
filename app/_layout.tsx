import { useCallback, useEffect, useState } from "react";
import { Text, TextInput } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme";

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
      router.replace("/auth");
    } else if (session && onAuthScreen) {
      router.replace("/");
    }

    if (!initialRouted) setInitialRouted(true);
  }, [session, loading, segments]);

  return null;
}

// ─── Themed navigator ────────────────────────────────────
function ThemedStack() {
  const { colors, isDark } = useTheme();

  const HEADER_BASE = {
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.fg,
    headerShadowVisible: false,
    headerTitleStyle: { fontFamily: "Switzer-Semibold", fontSize: 17 },
  } as const;

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.bgDeep }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="auth"
          options={{
            headerShown: false,
            animation: "none",
            contentStyle: { backgroundColor: colors.bgDeep },
          }}
        />
        <Stack.Screen
          name="(drawer)"
          options={{ contentStyle: { flex: 1, backgroundColor: colors.bgDeep } }}
        />
        <Stack.Screen
          name="profile-page"
          options={{
            animation: "default",
            headerShown: true,
            title: "Profile",
            ...HEADER_BASE,
            contentStyle: { flex: 1, backgroundColor: colors.bgDeep },
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
            contentStyle: { flex: 1, backgroundColor: colors.bg },
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
            contentStyle: { flex: 1, backgroundColor: colors.bg },
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
            contentStyle: { flex: 1, backgroundColor: colors.bg },
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
            contentStyle: { flex: 1, backgroundColor: colors.bgDeep },
          }}
        />
        <Stack.Screen
          name="player"
          options={{
            animation: "slide_from_right",
            headerShown: false,
            contentStyle: { flex: 1, backgroundColor: colors.bgDeep },
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

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
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </AuthProvider>
  );
}
