/**
 * Alarm Debug Screen
 * Accessible from Settings → Debug Alarms
 * Use this to verify alarm firing on device tonight.
 */
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  requestAlarmPermissions,
  scheduleAlarm,
  cancelAllAlarms,
  getPendingAlarms,
  SchedulableAlarm,
} from "@/lib/alarmScheduler";
import { F } from "@/lib/fonts";

// Dummy session ID — deep-sleep session from the seed data
// Change to any valid session ID from your Supabase sessions table
const TEST_SESSION_ID = "deep-sleep";

function formatDate(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function offsetAlarm(offsetMs: number, label: string): SchedulableAlarm {
  return {
    id: `debug-${offsetMs}`,
    label,
    next_fire_at: new Date(Date.now() + offsetMs).toISOString(),
    mantra_id: TEST_SESSION_ID,
    enabled: true,
    repeat_days: [],
  };
}

const TEST_ALARMS = [
  { label: "+1 min",  ms: 1 * 60 * 1000 },
  { label: "+5 min",  ms: 5 * 60 * 1000 },
  { label: "+30 min", ms: 30 * 60 * 1000 },
  { label: "+2 hr",   ms: 2 * 60 * 60 * 1000 },
];

export default function AlarmDebugScreen() {
  const [permStatus, setPermStatus] = useState<string>("checking…");
  const [pending, setPending] = useState<Notifications.NotificationRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshPending = useCallback(async () => {
    const p = await getPendingAlarms();
    setPending(p);
  }, []);

  useFocusEffect(useCallback(() => {
    refreshPending();
    Notifications.getPermissionsAsync().then(({ status }) => setPermStatus(status));
  }, [refreshPending]));

  const schedule = async (offsetMs: number, label: string) => {
    setLoading(true);
    const granted = await requestAlarmPermissions();
    if (!granted) {
      Alert.alert("Permission denied", "Notification permissions are required for alarms.");
      setLoading(false);
      return;
    }
    const alarm = offsetAlarm(offsetMs, `Test: ${label}`);
    const id = await scheduleAlarm(alarm);
    setLoading(false);
    if (id) {
      const fireAt = formatDate(new Date(alarm.next_fire_at));
      Alert.alert("Scheduled ✓", `"${alarm.label}" will fire at ${fireAt}.\n\nLock your phone and wait.`);
      await refreshPending();
    } else {
      Alert.alert("Failed", "Could not schedule alarm. Check console for errors.");
    }
  };

  const clearAll = async () => {
    await cancelAllAlarms();
    await refreshPending();
    Alert.alert("Cleared", "All pending alarms cancelled.");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>

      {/* Permission status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOTIFICATION PERMISSION</Text>
        <View style={styles.statusRow}>
          <View style={[
            styles.statusDot,
            { backgroundColor: permStatus === "granted" ? "#4cd964" : "#ff3b30" }
          ]} />
          <Text style={styles.statusText}>{permStatus}</Text>
        </View>
        {permStatus !== "granted" && (
          <Pressable style={styles.button} onPress={async () => {
            const ok = await requestAlarmPermissions();
            setPermStatus(ok ? "granted" : "denied");
          }}>
            <Text style={styles.buttonText}>Request Permission</Text>
          </Pressable>
        )}
      </View>

      {/* Schedule test alarms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SCHEDULE TEST ALARM</Text>
        <Text style={styles.hint}>
          Lock your phone after tapping. The alarm fires even if the app is killed.{"\n"}
          Silent mode will mute the sound (Critical Alerts not yet enabled).
        </Text>
        <View style={styles.buttonGrid}>
          {TEST_ALARMS.map(({ label, ms }) => (
            <Pressable
              key={label}
              style={styles.testButton}
              onPress={() => schedule(ms, label)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#f5f5f7" />
              ) : (
                <Text style={styles.testButtonText}>{label}</Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Pending notifications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PENDING ALARMS ({pending.length})</Text>
          <Pressable onPress={refreshPending}>
            <Text style={styles.refreshLink}>Refresh</Text>
          </Pressable>
        </View>

        {pending.length === 0 ? (
          <Text style={styles.emptyText}>No alarms scheduled.</Text>
        ) : (
          pending.map((n) => {
            const trigger = n.trigger as any;
            const fireDate = trigger?.value
              ? new Date(trigger.value * 1000)
              : trigger?.dateComponents
              ? null
              : null;
            return (
              <View key={n.identifier} style={styles.pendingRow}>
                <Text style={styles.pendingTitle}>
                  {n.content.title ?? n.identifier}
                </Text>
                <Text style={styles.pendingTime}>
                  {fireDate ? formatDate(fireDate) : "date unknown"}
                </Text>
              </View>
            );
          })
        )}

        {pending.length > 0 && (
          <Pressable style={styles.clearButton} onPress={clearAll}>
            <Text style={styles.clearButtonText}>Cancel All Alarms</Text>
          </Pressable>
        )}
      </View>

      {/* Test notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>WHAT TO VERIFY TONIGHT</Text>
        {[
          "✓ App open — notification banner appears + sound plays",
          "✓ App backgrounded — notification fires, tap → opens player",
          "✓ App killed — notification fires, tap → opens player",
          "✓ Phone locked — notification fires on lock screen",
          "? DND/Focus mode — should break through (Time Sensitive)",
          "✗ Silent mode — will NOT make sound (needs Critical Alerts)",
          "✗ Auto-play audio — not yet implemented (tap required)",
        ].map((line, i) => (
          <Text key={i} style={[
            styles.checkLine,
            line.startsWith("✗") && { color: "#ff3b30" },
            line.startsWith("?") && { color: "#ff9f0a" },
          ]}>
            {line}
          </Text>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  scroll: { padding: 20, paddingBottom: 60 },

  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: {
    color: "#52525b",
    fontSize: 12,
    fontFamily: F.semibold,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  hint: {
    color: "#52525b",
    fontSize: 13,
    fontFamily: F.regular,
    lineHeight: 19,
    marginBottom: 16,
  },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: "#f5f5f7", fontSize: 15, fontFamily: F.regular },

  button: {
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#f5f5f7", fontSize: 15, fontFamily: F.medium },

  buttonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  testButton: {
    flex: 1,
    minWidth: "44%",
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  testButtonText: { color: "#f5f5f7", fontSize: 16, fontFamily: F.medium },

  refreshLink: { color: "#3B82F6", fontSize: 13, fontFamily: F.regular },

  pendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1c1e",
  },
  pendingTitle: { color: "#f5f5f7", fontSize: 14, fontFamily: F.regular, flex: 1 },
  pendingTime: { color: "#52525b", fontSize: 14, fontFamily: F.regular },

  clearButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  clearButtonText: { color: "#ff3b30", fontSize: 15, fontFamily: F.regular },

  emptyText: { color: "#3f3f46", fontSize: 14, fontFamily: F.regular },

  checkLine: {
    color: "#4cd964",
    fontSize: 13,
    fontFamily: F.regular,
    lineHeight: 22,
  },
});
