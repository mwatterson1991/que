import { useState, useEffect } from "react";
import { ScrollView, Alert, Linking, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useProfile, usePreferences } from "@/lib/useSupabase";
import { supabase } from "@/lib/supabase";
import { AMBIENT_SOUNDS, AmbientSoundId } from "@/lib/ambient";
import { Screen, Section, Row, Toggle, Txt } from "@/components/ui";
import { SP } from "@/lib/tokens";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { prefs, update: updatePrefs } = usePreferences();
  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);

  // Sync local toggles with Supabase preferences
  useEffect(() => {
    if (prefs) {
      setNotifications(prefs.notifications);
      setHaptics(prefs.haptics);
    }
  }, [prefs]);

  const toggleNotifications = (val: boolean) => {
    setNotifications(val);
    updatePrefs({ notifications: val });
  };
  const toggleHaptics = (val: boolean) => {
    setHaptics(val);
    updatePrefs({ haptics: val });
  };

  const displayName = profile?.first_name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email
    ? user.email.slice(0, 3) + "***@" + user.email.split("@")[1]
    : "";
  const ambientLabel =
    AMBIENT_SOUNDS.find((s) => s.id === (prefs?.ambient_sound as AmbientSoundId))?.label ?? "Silence";

  const resetOnboarding = () =>
    Alert.alert(
      "Reset Onboarding",
      "This will clear your onboarding state and restart the intro flow on next login.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.updateUser({ data: { onboarded: false } });
            Alert.alert("Done", "Sign out and back in to see the onboarding flow.");
          },
        },
      ]
    );

  const confirmSignOut = () =>
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/welcome" as any);
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        <Section header="Account">
          <Row icon="person" title="Profile" value={displayName} onPress={() => router.push("/edit-profile" as any)} />
          <Row icon="mail" title="Email" value={displayEmail} onPress={() => router.push("/edit-email" as any)} />
        </Section>

        <Section header="Preferences">
          <Row
            icon="notifications"
            title="Notifications"
            right={<Toggle value={notifications} onValueChange={toggleNotifications} accessibilityLabel="Notifications" />}
          />
          <Row
            icon="phone-portrait"
            title="Haptics"
            right={<Toggle value={haptics} onValueChange={toggleHaptics} accessibilityLabel="Haptics" />}
          />
        </Section>

        <Section header="App">
          <Row
            icon="water"
            title="Ambient Sound"
            value={ambientLabel}
            onPress={() => router.push(`/ambient-picker?current=${prefs?.ambient_sound ?? "silence"}` as any)}
          />
        </Section>

        {/* Developer — hidden in release builds */}
        {__DEV__ && (
          <Section header="Developer">
            <Row icon="bug" title="Debug Alarms" onPress={() => router.push("/alarm-debug" as any)} />
            <Row icon="refresh" title="Reset Onboarding" accessory="none" onPress={resetOnboarding} />
          </Section>
        )}

        <Section header="Support">
          <Row
            icon="chatbox"
            title="Send Feedback"
            onPress={() => Linking.openURL("mailto:michaelgwatterson@gmail.com?subject=Morning%20Que%20feedback")}
          />
          <Row
            icon="help-circle"
            title="Support"
            onPress={() => Linking.openURL("https://mwatterson1991.github.io/morningque-site/support.html")}
          />
          <Row
            icon="lock-closed"
            title="Privacy Policy"
            onPress={() => Linking.openURL("https://mwatterson1991.github.io/morningque-site/privacy.html")}
          />
        </Section>

        <Section>
          <Row title="Sign Out" destructive accessory="none" onPress={confirmSignOut} />
        </Section>

        <Txt kind="footnote" tone="tertiary" style={styles.version}>
          Morning Que v1.0.0
        </Txt>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: SP.xxxl,
  },
  version: {
    textAlign: "center",
    marginTop: SP.xxl,
  },
});
