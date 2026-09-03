import { useState, useEffect, useRef, type ComponentProps } from "react";
import { View, TextInput, Alert, KeyboardAvoidingView, Platform, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Screen, Txt, Section, Button, IconButton } from "@/components/ui";
import { C, SP, TYPE } from "@/lib/tokens";

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
      <Txt kind="body" style={{ opacity: visible ? 1 : 0 }}>
        {displayed}
        {visible && displayed.length > 0 && displayed.length < PHRASES[phraseIndex].length && (
          <Txt kind="body" tone="tertiary">|</Txt>
        )}
      </Txt>
    </View>
  );
}

// ─── Field (a TextInput inside a grouped-list cell) ──────
function Field(props: ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.cell}>
      <TextInput
        placeholderTextColor={C.labelTertiary}
        selectionColor={C.accent}
        {...props}
        style={[TYPE.body, { color: C.label }]}
      />
    </View>
  );
}

// ─── Auth modes ──────────────────────────────────────────
type Mode = "landing" | "login" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
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
      <Screen>
        <View style={[styles.topBar, { paddingTop: top }]}>
          <IconButton
            icon="chevron-back"
            label="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/welcome" as any))}
          />
        </View>
        <View style={styles.center}>
          <Txt kind="editorial" style={styles.wordmark}>Morning Que</Txt>
          <CyclingTagline />
        </View>

        <View style={[styles.footer, { paddingBottom: bottom + SP.lg }]}>
          <Button title="Create account" onPress={() => setMode("signup")} />
          <Button title="Log in" tone="plain" onPress={() => setMode("login")} style={styles.link} />
          <Txt kind="caption1" tone="tertiary" style={styles.legal}>
            By continuing you agree to our Terms & Privacy Policy.
          </Txt>
        </View>
      </Screen>
    );
  }

  // ─── Login / Sign-up form ───────────────────────────────
  const isSignUp = mode === "signup";

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: top }]}>
          <IconButton icon="chevron-back" label="Back" onPress={() => setMode("landing")} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.form, { paddingBottom: bottom + SP.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <Txt kind="title1" style={styles.formTitle}>
            {isSignUp ? "Create account" : "Welcome back"}
          </Txt>

          {isSignUp && (
            <Section header="Name">
              <Field value={firstName} onChangeText={setFirstName} placeholder="First name" autoCapitalize="words" />
              <Field value={lastName} onChangeText={setLastName} placeholder="Last name" autoCapitalize="words" />
            </Section>
          )}

          <Section header="Account">
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Field value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
          </Section>

          <View style={styles.footer}>
            <Button
              title={busy ? "Please wait..." : isSignUp ? "Create account" : "Log in"}
              onPress={isSignUp ? handleSignUp : handleLogin}
              disabled={busy}
            />
            <Button
              title={isSignUp ? "Already have an account? Log in" : "Don't have an account? Sign up"}
              tone="plain"
              onPress={() => setMode(isSignUp ? "login" : "signup")}
              style={styles.link}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SP.xs,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SP.screen,
  },
  wordmark: {
    marginBottom: SP.md,
    textAlign: "center",
  },
  taglineRow: {
    height: SP.row,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: SP.screen,
    paddingTop: SP.xxl,
  },
  link: {
    marginTop: SP.xs,
  },
  legal: {
    textAlign: "center",
    marginTop: SP.md,
  },

  // Form
  form: {
    flexGrow: 1,
    justifyContent: "center",
  },
  formTitle: {
    paddingHorizontal: SP.screen,
  },
  cell: {
    backgroundColor: C.fill,
    paddingHorizontal: SP.lg,
    minHeight: SP.row,
    justifyContent: "center",
  },
});
