import { View, Text, Pressable, ScrollView, Switch, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { F } from "@/lib/fonts";
import { useAuth } from "@/lib/auth";
import { useProfile, usePreferences } from "@/lib/useSupabase";
import { useTheme, useColors } from "@/lib/theme";

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
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={20} color={c.fgMid} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: c.fg }]}>{label}</Text>
      <View style={styles.rowRight}>
        {hasToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ true: c.switchOn, false: c.switchOff }}
            thumbColor="#ffffff"
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        ) : value ? (
          <>
            <Text style={[styles.rowValue, { color: c.fgDim }]}>{value}</Text>
            <Ionicons name="chevron-forward" size={16} color={c.fgFaint} />
          </>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={c.fgFaint} />
        )}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { prefs, update: updatePrefs } = usePreferences();
  const { mode, setMode } = useTheme();
  const c = useColors();
  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);

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
  const toggleDarkMode = (val: boolean) => {
    setMode(val ? "dark" : "light");
  };

  const displayName = profile?.first_name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email
    ? user.email.slice(0, 3) + "***@" + user.email.split("@")[1]
    : "";

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.scroll}>
      <Text style={[styles.sectionTitle, { color: c.fgDim }]}>ACCOUNT</Text>
      <SettingsRow
        icon="person-outline"
        label="Profile"
        value={displayName}
        onPress={() => router.push("/edit-profile" as any)}
      />
      <View style={[styles.rowSep, { backgroundColor: c.panelHigh }]} />
      <SettingsRow
        icon="mail-outline"
        label="Email"
        value={displayEmail}
        onPress={() => router.push("/edit-email" as any)}
      />
      <View style={[styles.rowSep, { backgroundColor: c.panelHigh }]} />
      <SettingsRow
        icon="shield-checkmark-outline"
        label="Privacy"
        onPress={() => Alert.alert("Privacy", "Privacy settings coming soon.")}
      />

      <Text style={[styles.sectionTitle, { color: c.fgDim }]}>PREFERENCES</Text>
      <SettingsRow
        icon="notifications-outline"
        label="Notifications"
        hasToggle
        toggleValue={notifications}
        onToggle={toggleNotifications}
      />
      <View style={[styles.rowSep, { backgroundColor: c.panelHigh }]} />
      <SettingsRow
        icon="phone-portrait-outline"
        label="Haptics"
        hasToggle
        toggleValue={haptics}
        onToggle={toggleHaptics}
      />
      <View style={[styles.rowSep, { backgroundColor: c.panelHigh }]} />
      <SettingsRow
        icon="moon-outline"
        label="Dark Mode"
        hasToggle
        toggleValue={mode === "dark"}
        onToggle={toggleDarkMode}
      />

      <Text style={[styles.sectionTitle, { color: c.fgDim }]}>APP</Text>
      <SettingsRow
        icon="volume-high-outline"
        label="Default Sound"
        value="Focus"
        onPress={() => router.push("/sounds" as any)}
      />
      <View style={[styles.rowSep, { backgroundColor: c.panelHigh }]} />
      <SettingsRow
        icon="time-outline"
        label="Default Duration"
        value="10 min"
        onPress={() => Alert.alert("Duration", "Duration picker coming soon.")}
      />
      <View style={[styles.rowSep, { backgroundColor: c.panelHigh }]} />
      <SettingsRow
        icon="cloud-outline"
        label="Data & Storage"
        onPress={() => Alert.alert("Data & Storage", "Storage management coming soon.")}
      />

      <Text style={[styles.sectionTitle, { color: c.fgDim }]}>SUPPORT</Text>
      <SettingsRow
        icon="help-circle-outline"
        label="Help Center"
        onPress={() => Alert.alert("Help Center", "Help center coming soon.")}
      />
      <View style={[styles.rowSep, { backgroundColor: c.panelHigh }]} />
      <SettingsRow
        icon="chatbox-outline"
        label="Send Feedback"
        onPress={() => Alert.alert("Feedback", "Feedback form coming soon.")}
      />
      <View style={[styles.rowSep, { backgroundColor: c.panelHigh }]} />
      <SettingsRow
        icon="document-text-outline"
        label="Terms of Service"
        onPress={() => Alert.alert("Terms", "Terms of service coming soon.")}
      />
      <View style={[styles.rowSep, { backgroundColor: c.panelHigh }]} />
      <SettingsRow
        icon="lock-closed-outline"
        label="Privacy Policy"
        onPress={() => Alert.alert("Privacy", "Privacy policy coming soon.")}
      />

      <Pressable
        style={styles.signOutButton}
        onPress={() => Alert.alert("Sign Out", "Are you sure?", [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Out", style: "destructive", onPress: async () => {
            await signOut();
            router.replace("/auth");
          }},
        ])}
      >
        <Text style={[styles.signOutText, { color: c.danger }]}>Sign Out</Text>
      </Pressable>

      <Text style={[styles.version, { color: c.fgFaint }]}>Morning Q v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },

  sectionTitle: {
    fontSize: 13,
    fontFamily: F.semibold,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 28,
  },

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
    fontSize: 16,
    fontFamily: F.regular,
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    fontSize: 15,
    fontFamily: F.regular,
  },
  rowSep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 32,
  },

  signOutButton: {
    marginTop: 36,
    paddingVertical: 16,
    alignItems: "center",
  },
  signOutText: {
    fontSize: 16,
    fontFamily: F.medium,
  },

  version: {
    fontSize: 13,
    fontFamily: F.regular,
    textAlign: "center",
    marginTop: 20,
  },
});
