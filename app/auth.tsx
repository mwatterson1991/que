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
import { useColors } from "@/lib/theme";
import { F } from "@/lib/fonts";

const PHRASES = [
  "Start your day the right way",
  "The alarm clock that doesn't suck",
  "Wake up on the right side of the bed",
];

function CyclingTagline() {
  const c = useColors();
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
      <Text style={[styles.taglineText, { color: c.fg, opacity: visible ? 1 : 0 }]}>
        {displayed}
        {visible && displayed.length > 0 && displayed.length < PHRASES[phraseIndex].length && (
          <Text style={[styles.cursor, { color: c.fgDim }]}>|</Text>
        )}
      </Text>
    </View>
  );
}

type Mode = "landing" | "login" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const c = useColors();

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
    } else {
      router.replace("/");
    }
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

  if (mode === "landing") {
    return (
      <View style={[styles.container, { backgroundColor: c.bgDeep }]}>
        <Pressable onPress={() => router.replace("/")} style={styles.closeButton} hitSlop={16}>
          <Ionicons name="close" size={24} color={c.fg} />
        </Pressable>

        <View style={styles.center}>
          <Text style={[styles.logoText, { color: c.fg }]}>Morning Q</Text>
          <CyclingTagline />
        </View>

        <View style={[styles.bottomSheet, { backgroundColor: c.panelMid }]}>
          <Pressable style={[styles.appleButton, { backgroundColor: c.fg }]}>
            <Ionicons name="logo-apple" size={20} color={c.fgInverted} />
            <Text style={[styles.appleText, { color: c.fgInverted }]}>Continue with Apple</Text>
          </Pressable>

          <Pressable style={[styles.darkButton, { backgroundColor: c.panelHigh, borderColor: c.borderMid }]}>
            <Text style={[styles.googleG, { color: c.fg }]}>G</Text>
            <Text style={[styles.darkButtonText, { color: c.fg }]}>Continue with Google</Text>
          </Pressable>

          <Pressable style={[styles.darkButton, { backgroundColor: c.panelHigh, borderColor: c.borderMid }]} onPress={() => setMode("signup")}>
            <Text style={[styles.darkButtonText, { color: c.fg }]}>Sign up</Text>
          </Pressable>

          <Pressable style={styles.loginButton} onPress={() => setMode("login")}>
            <Text style={[styles.darkButtonText, { color: c.fg }]}>Log in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isSignUp = mode === "signup";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: c.bgDeep }]}
    >
      <Pressable onPress={() => setMode("landing")} style={styles.closeButton} hitSlop={16}>
        <Ionicons name="arrow-back" size={24} color={c.fg} />
      </Pressable>

      <View style={styles.formCenter}>
        <Text style={[styles.formTitle, { color: c.fg }]}>{isSignUp ? "Create account" : "Welcome back"}</Text>

        {isSignUp && (
          <View style={styles.nameRow}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={c.fgFaint}
              style={[styles.input, { flex: 1, backgroundColor: c.panelMid, borderColor: c.panelHigh, color: c.fg }]}
              autoCapitalize="words"
            />
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={c.fgFaint}
              style={[styles.input, { flex: 1, backgroundColor: c.panelMid, borderColor: c.panelHigh, color: c.fg }]}
              autoCapitalize="words"
            />
          </View>
        )}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={c.fgFaint}
          style={[styles.input, { backgroundColor: c.panelMid, borderColor: c.panelHigh, color: c.fg }]}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={c.fgFaint}
          style={[styles.input, { backgroundColor: c.panelMid, borderColor: c.panelHigh, color: c.fg }]}
          secureTextEntry
        />

        <Pressable
          style={[styles.submitButton, { backgroundColor: c.fg }, busy && { opacity: 0.5 }]}
          onPress={isSignUp ? handleSignUp : handleLogin}
          disabled={busy}
        >
          <Text style={[styles.submitText, { color: c.fgInverted }]}>
            {busy ? "Please wait..." : isSignUp ? "Create account" : "Log in"}
          </Text>
        </Pressable>

        <Pressable onPress={() => setMode(isSignUp ? "login" : "signup")}>
          <Text style={[styles.switchText, { color: c.fgDim }]}>
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
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 99,
    padding: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "Lora",
    fontSize: 32,
    fontWeight: "400",
    marginBottom: 12,
  },
  taglineRow: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  taglineText: {
    fontSize: 16,
    fontFamily: F.regular,
  },
  cursor: {
    fontWeight: "300",
  },

  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 12,
  },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    height: 56,
    gap: 8,
  },
  appleText: {
    fontSize: 17,
    fontFamily: F.semibold,
  },
  darkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    height: 56,
    borderWidth: 1,
    gap: 8,
  },
  darkButtonText: {
    fontSize: 17,
    fontFamily: F.semibold,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 14,
  },
  googleG: {
    fontSize: 18,
    fontFamily: F.bold,
  },

  formCenter: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  formTitle: {
    fontSize: 28,
    fontFamily: F.bold,
    marginBottom: 28,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: F.regular,
    marginBottom: 14,
    borderWidth: 1,
  },
  submitButton: {
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitText: {
    fontSize: 17,
    fontFamily: F.semibold,
  },
  switchText: {
    fontSize: 15,
    fontFamily: F.regular,
    textAlign: "center",
    marginTop: 20,
  },
});
