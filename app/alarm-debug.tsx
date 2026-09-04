/**
 * Alarm Debug Screen
 * Accessible from Settings → Debug Alarms
 * Use this to verify alarm firing on device tonight.
 */
import { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  requestAlarmPermissions,
  scheduleAlarm,
  cancelAllAlarms,
  getPendingAlarms,
  SchedulableAlarm,
} from "@/lib/alarmScheduler";
import { Screen, Section, Row, Button } from "@/components/ui";
import { C, SP } from "@/lib/tokens";

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

// What to verify tonight: expected (ok), unsure (maybe), known gap (no).
const MARK = {
  ok: { icon: "checkmark-circle", color: C.switchOn },
  maybe: { icon: "help-circle", color: C.accent },
  no: { icon: "close-circle", color: C.danger },
} as const;

const CHECKS: { mark: keyof typeof MARK; title: string; detail: string }[] = [
  { mark: "ok", title: "App open", detail: "Notification banner appears + sound plays" },
  { mark: "ok", title: "App backgrounded", detail: "Alarm fires; tapping it opens the player" },
  { mark: "ok", title: "App killed", detail: "Alarm fires; tapping it opens the player" },
  { mark: "ok", title: "Phone locked", detail: "Notification fires on lock screen" },
  { mark: "maybe", title: "DND / Focus mode", detail: "Should break through (Time Sensitive)" },
  { mark: "maybe", title: "Silent mode", detail: "Rings on iOS 26 (native alarm). Muted on older iOS and Android." },
  { mark: "no", title: "Auto-play audio", detail: "Not yet implemented (tap required)" },
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

  const granted = permStatus === "granted";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Alarm Debug" }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        {/* Permission status */}
        <Section header="Notification Permission">
          <Row
            icon={granted ? "checkmark-circle" : "close-circle"}
            iconColor={granted ? C.switchOn : C.danger}
            title="Status"
            value={permStatus}
          />
        </Section>
        {!granted && (
          <View style={styles.buttons}>
            <Button
              tone="gray"
              title="Request Permission"
              onPress={async () => {
                const ok = await requestAlarmPermissions();
                setPermStatus(ok ? "granted" : "denied");
              }}
            />
          </View>
        )}

        {/* Schedule test alarms */}
        <Section
          header="Schedule Test Alarm"
          footer="Lock your phone after tapping. The alarm fires even if the app is killed. On iOS 26 it is a real alarm and rings through silent mode; elsewhere it is a burst of five chimes a minute apart."
        >
          <View style={styles.grid}>
            {TEST_ALARMS.map(({ label, ms }) => (
              <Button
                key={label}
                tone="gray"
                title={label}
                disabled={loading}
                onPress={() => schedule(ms, label)}
                style={styles.gridButton}
              />
            ))}
          </View>
        </Section>
        {loading && <ActivityIndicator color={C.labelSecondary} style={styles.spinner} />}

        {/* Pending notifications */}
        <Section header={`Pending Alarms (${pending.length})`}>
          {pending.length === 0 ? (
            <Row title="No alarms scheduled" accessory="none" disabled />
          ) : (
            pending.map((n) => {
              const trigger = n.trigger as any;
              const fireDate = trigger?.value ? new Date(trigger.value * 1000) : null;
              return (
                <Row
                  key={n.identifier}
                  title={n.content.title ?? n.identifier}
                  value={fireDate ? formatDate(fireDate) : "date unknown"}
                />
              );
            })
          )}
        </Section>
        <View style={styles.buttons}>
          <Button tone="gray" title="Refresh" onPress={refreshPending} />
          {pending.length > 0 && <Button tone="destructive" title="Cancel All Alarms" onPress={clearAll} />}
        </View>

        {/* Test notes */}
        <Section header="What to Verify Tonight">
          {CHECKS.map((c) => (
            <Row
              key={c.title}
              icon={MARK[c.mark].icon}
              iconColor={MARK[c.mark].color}
              title={c.title}
              subtitle={c.detail}
            />
          ))}
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: SP.xxxl,
  },
  buttons: {
    paddingHorizontal: SP.screen,
    marginTop: SP.md,
    gap: SP.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SP.sm,
    padding: SP.md,
  },
  gridButton: {
    flexGrow: 1,
    flexBasis: "45%",
  },
  spinner: {
    marginTop: SP.md,
  },
});
