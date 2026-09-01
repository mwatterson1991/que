import { View, Text, Pressable, ScrollView, Switch, Alert, StyleSheet, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { F, S } from "@/lib/fonts";
import { useAuth } from "@/lib/auth";
import { useProfile, usePreferences } from "@/lib/useSupabase";
import { supabase } from "@/lib/supabase";
import { useMaterial } from "@/lib/material";
import { AMBIENT_SOUNDS, AmbientSoundId } from "@/lib/ambient";

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  onPress?: () => void;
};

function SettingsRow({ icon, label, value, hasToggle, toggleValue, onToggle, onPress }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessible={!hasToggle}
      accessibilityRole={hasToggle ? undefined : "button"}
      accessibilityLabel={hasToggle ? undefined : value ? `${label}, ${value}` : label}
    >
      <Ionicons name={icon} size={20} color="#a1a1aa" style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {hasToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ true: "#4cd964", false: "#39393d" }}
            thumbColor="#ffffff"
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            accessibilityRole="switch"
            accessibilityState={{ checked: toggleValue }}
            accessibilityLabel={label}
          />
        ) : value ? (
          <>
            <Text style={styles.rowValue}>{value}</Text>
            <Ionicons name="chevron-forward" size={16} color="#52525b" />
          </>
        ) : (
          <Ionicons name="chevron-forward" size={16} color="#52525b" />
        )}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { mode, setMode } = useMaterial();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { prefs, update: updatePrefs } = usePreferences();
  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // Sync local toggles with Supabase preferences
  useEffect(() => {
    if (prefs) {
      setNotifications(prefs.notifications);
      setHaptics(prefs.haptics);
      setDarkMode(prefs.dark_mode);
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
  const toggleDarkMode = (val: boolean) => {
    setDarkMode(val);
    updatePrefs({ dark_mode: val });
  };

  const displayName = profile?.first_name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email
    ? user.email.slice(0, 3) + "***@" + user.email.split("@")[1]
    : "";

  return (
    <ScrollView
      style={styles.container}
      // The rows scroll under the floating glass nav, so the list starts
      // below it rather than being clipped by a bar.
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 56 }]}
    >
      {/* Account */}
      <Text style={styles.sectionTitle}>ACCOUNT</Text>
      <SettingsRow
        icon="person-outline"
        label="Profile"
        value={displayName}
        onPress={() => router.push("/edit-profile" as any)}
      />
      <View style={styles.rowSep} />
      <SettingsRow
        icon="mail-outline"
        label="Email"
        value={displayEmail}
        onPress={() => router.push("/edit-email" as any)}
      />

      {/* Preferences */}
      <Text style={styles.sectionTitle}>PREFERENCES</Text>
      <SettingsRow
        icon="notifications-outline"
        label="Notifications"
        hasToggle
        toggleValue={notifications}
        onToggle={toggleNotifications}
      />
      <View style={styles.rowSep} />
      <SettingsRow
        icon="phone-portrait-outline"
        label="Haptics"
        hasToggle
        toggleValue={haptics}
        onToggle={toggleHaptics}
      />

      {/* App */}
      <Text style={styles.sectionTitle}>APP</Text>
      <SettingsRow
        icon="layers-outline"
        label="Material"
        value={mode === "matte" ? "Matte" : "Glass"}
        onPress={() => setMode(mode === "matte" ? "glass" : "matte")}
      />
      <View style={styles.rowSep} />
      <SettingsRow
        icon="color-palette-outline"
        label="Background"
        onPress={() => router.push("/background-picker" as any)}
      />
      <View style={styles.rowSep} />
      <SettingsRow
        icon="water-outline"
        label="Ambient Sound"
        value={
          AMBIENT_SOUNDS.find(
            (s) => s.id === (prefs?.ambient_sound as AmbientSoundId),
          )?.label ?? "Silence"
        }
        onPress={() =>
          router.push(
            `/ambient-picker?current=${prefs?.ambient_sound ?? "silence"}` as any,
          )
        }
      />

      {/* Developer — hidden in release builds */}
      {__DEV__ && (
        <>
      <Text style={styles.sectionTitle}>DEVELOPER</Text>
      <SettingsRow
        icon="bug-outline"
        label="Debug Alarms"
        onPress={() => router.push("/alarm-debug" as any)}
      />
      <View style={styles.rowSep} />
      <SettingsRow
        icon="refresh-outline"
        label="Reset Onboarding"
        onPress={() =>
          Alert.alert(
            "Reset Onboarding",
            "This will clear your onboarding state and restart the intro flow on next login.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Reset",
                style: "destructive",
                onPress: async () => {
                  await supabase.auth.updateUser({
                    data: { onboarded: false },
                  });
                  Alert.alert("Done", "Sign out and back in to see the onboarding flow.");
                },
              },
            ]
          )
        }
      />

        </>
      )}

      {/* Support */}
      <Text style={styles.sectionTitle}>SUPPORT</Text>
      <SettingsRow
        icon="chatbox-outline"
        label="Send Feedback"
        onPress={() => Linking.openURL("mailto:michaelgwatterson@gmail.com?subject=Morning%20Que%20feedback")}
      />
      <View style={styles.rowSep} />
      <SettingsRow
        icon="help-circle-outline"
        label="Support"
        onPress={() => Linking.openURL("https://mwatterson1991.github.io/morningque-site/support.html")}
      />
      <View style={styles.rowSep} />
      <SettingsRow
        icon="lock-closed-outline"
        label="Privacy Policy"
        onPress={() => Linking.openURL("https://mwatterson1991.github.io/morningque-site/privacy.html")}
      />

      {/* Sign out */}
      <Pressable
        style={styles.signOutButton}
        accessibilityRole="button"
        onPress={() => Alert.alert("Sign Out", "Are you sure?", [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Out", style: "destructive", onPress: async () => {
            await signOut();
            router.replace("/welcome" as any);
          }},
        ])}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Text style={styles.version}>Morning Que v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },

  // Sections
  sectionTitle: {
    color: "#8b8b93",
    fontSize: S.caption,
    fontFamily: F.semibold,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 28,
  },

  // Rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    minHeight: 52,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    color: "#f5f5f7",
    fontSize: S.body,
    fontFamily: F.regular,
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    color: "#8b8b93",
    fontSize: S.secondary,
    fontFamily: F.regular,
  },
  rowSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2c2c2e",
    marginLeft: 32,
  },

  // Sign out
  signOutButton: {
    marginTop: 36,
    paddingVertical: 16,
    alignItems: "center",
  },
  signOutText: {
    color: "#ff3b30",
    fontSize: S.body,
    fontFamily: F.medium,
  },

  // Version
  version: {
    color: "#52525b",
    fontSize: S.caption,
    fontFamily: F.regular,
    textAlign: "center",
    marginTop: 20,
  },
});
