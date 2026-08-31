import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Glass, GlassButton } from "@/components/Glass";
import { F, S } from "@/lib/fonts";

const PHRASES = [
  "Your mind is trainable.",
  "Wake up. Rewire. Repeat.",
  "The alarm that changes how you think.",
];

// ─── Cycling tagline ─────────────────────────────────────
function CyclingTagline() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [visible, setVisible] = useState(true);
  const phaseRef = useRef<"typing" | "holding" | "fading" | "waiting">("typing");
  const charRef = useRef(0);
  const idxRef = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const phase = phaseRef.current;
      const phrase = PHRASES[idxRef.current];

      if (phase === "typing") {
        charRef.current++;
        setDisplayed(phrase.slice(0, charRef.current));
        if (charRef.current >= phrase.length) {
          phaseRef.current = "holding";
          timer = setTimeout(tick, 2000);
        } else {
          timer = setTimeout(tick, 35);
        }
      } else if (phase === "holding") {
        phaseRef.current = "fading";
        setVisible(false);
        timer = setTimeout(tick, 400);
      } else if (phase === "fading") {
        phaseRef.current = "waiting";
        idxRef.current = (idxRef.current + 1) % PHRASES.length;
        charRef.current = 0;
        setDisplayed("");
        setPhraseIndex(idxRef.current);
        timer = setTimeout(tick, 200);
      } else if (phase === "waiting") {
        phaseRef.current = "typing";
        setVisible(true);
        timer = setTimeout(tick, 35);
      }
    }

    timer = setTimeout(tick, 35);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.taglineRow}>
      <Text style={[styles.taglineText, { opacity: visible ? 1 : 0 }]}>
        {displayed}
        {visible && displayed.length > 0 && displayed.length < PHRASES[phraseIndex].length && (
          <Text style={styles.cursor}>|</Text>
        )}
      </Text>
    </View>
  );
}

// ─── Auth modes ──────────────────────────────────────────
type Mode = "landing" | "login" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<Mode>("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    setBusy(true);
    const { error } = await signInWithEmail(email, password);
    setBusy(false);
    if (error) {
      Alert.alert("Login failed", error.message);
    }
    // AuthGate in _layout.tsx handles routing after session is set
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const { error } = await signUpWithEmail(email, password, firstName, lastName);
    setBusy(false);
    if (error) {
      Alert.alert("Sign up failed", error.message);
    } else {
      Alert.alert(
        "Check your email",
        "We sent you a confirmation link. Tap it to activate your account, then log in.",
        [{ text: "OK", onPress: () => setMode("login") }]
      );
    }
  };

  // ─── Landing (buttons only) ─────────────────────────────
  if (mode === "landing") {
    return (
      <View style={styles.container}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/welcome" as any))}
          style={styles.closeButton}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Glass liquid intensity={1.1} scrim="soft" style={styles.closeGlass}>
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </Glass>
        </Pressable>
        <View style={styles.center}>
          <Text style={styles.logoText}>Morning Que</Text>
          <CyclingTagline />
        </View>

        <View style={styles.bottomSheet}>
          <Pressable onPress={() => setMode("signup")} accessibilityRole="button" accessibilityLabel="Create account">
            <GlassButton tone="bright" phase={0.15} style={styles.sheetButton}>
              <Text style={styles.primaryButtonText}>Create account</Text>
            </GlassButton>
          </Pressable>

          <Pressable onPress={() => setMode("login")} accessibilityRole="button" accessibilityLabel="Log in">
            <GlassButton tone="quiet" phase={0.55} style={styles.sheetButton}>
              <Text style={styles.darkButtonText}>Log in</Text>
            </GlassButton>
          </Pressable>

          <Text style={styles.legalText}>
            By continuing you agree to our Terms & Privacy Policy.
          </Text>
        </View>
      </View>
    );
  }

  // ─── Login / Sign-up form ───────────────────────────────
  const isSignUp = mode === "signup";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <Pressable onPress={() => setMode("landing")} style={styles.closeButton} hitSlop={16} accessibilityRole="button" accessibilityLabel="Back">
        <Glass liquid intensity={1.1} scrim="soft" style={styles.closeGlass}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </Glass>
      </Pressable>

      <View style={styles.formCenter}>
        <Text style={styles.formTitle}>{isSignUp ? "Create account" : "Welcome back"}</Text>

        {isSignUp && (
          <View style={styles.nameRow}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#52525b"
              style={[styles.input, { flex: 1 }]}
              autoCapitalize="words"
            />
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#52525b"
              style={[styles.input, { flex: 1 }]}
              autoCapitalize="words"
            />
          </View>
        )}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#52525b"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#52525b"
          style={styles.input}
          secureTextEntry
        />

        <Pressable
          style={[styles.submitWrap, busy && { opacity: 0.5 }]}
          onPress={isSignUp ? handleSignUp : handleLogin}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
        >
          <GlassButton tone="bright" phase={0.25} style={styles.submitButton}>
            <Text style={styles.submitText}>
              {busy ? "Please wait..." : isSignUp ? "Create account" : "Log in"}
            </Text>
          </GlassButton>
        </Pressable>

        <Pressable onPress={() => setMode(isSignUp ? "login" : "signup")}>
          <Text style={styles.switchText}>
            {isSignUp ? "Already have an account? Log in" : "Don't have an account? Sign up"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  closeButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 99,
  },
  closeGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "Lora",
    fontSize: S.display,
    fontWeight: "400",
    color: "#f5f5f7",
    marginBottom: 12,
  },
  taglineRow: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  taglineText: {
    fontSize: S.body,
    fontFamily: F.regular,
    color: "#f5f5f7",
  },
  cursor: {
    color: "#8b8b93",
    fontWeight: "300",
  },

  // Bottom sheet (landing)
  bottomSheet: {
    backgroundColor: "#000000",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "#1c1c1e",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 12,
  },
  sheetButton: {
    borderRadius: 16,
    height: 58,
    paddingVertical: 0,
  },
  primaryButtonText: {
    fontSize: S.body,
    fontFamily: F.semibold,
    color: "#ffffff",
  },
  darkButtonText: {
    fontSize: S.body,
    fontFamily: F.semibold,
    color: "#f5f5f7",
  },
  legalText: {
    fontSize: S.micro,
    fontFamily: F.regular,
    color: "#3f3f46",
    textAlign: "center",
    marginTop: 4,
  },

  // Form screen
  formCenter: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  formTitle: {
    fontSize: S.heading,
    fontFamily: F.bold,
    color: "#f5f5f7",
    marginBottom: 28,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: "#f5f5f7",
    fontSize: S.body,
    fontFamily: F.regular,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  submitWrap: {
    marginTop: 8,
  },
  submitButton: {
    borderRadius: 14,
    height: 56,
    paddingVertical: 0,
  },
  submitText: {
    fontSize: S.body,
    fontFamily: F.semibold,
    color: "#ffffff",
  },
  switchText: {
    color: "#8b8b93",
    fontSize: S.secondary,
    fontFamily: F.regular,
    textAlign: "center",
    marginTop: 20,
  },
});
