import { View, Text, FlatList, Switch, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAlarms, useSessions } from "@/lib/useSupabase";
import { useColors } from "@/lib/theme";
import { F } from "@/lib/fonts";
import type { Database } from "@/lib/database.types";

type Alarm = Database["public"]["Tables"]["alarms"]["Row"];

function formatTime(iso: string) {
  const d = new Date(iso);
  let hour = d.getHours();
  const minute = d.getMinutes();
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  const minStr = minute.toString().padStart(2, "0");
  return { hour: `${hour}:${minStr}`, ampm };
}

type SessionMap = Record<string, Database["public"]["Tables"]["sessions"]["Row"]>;

function AlarmRow({ item, onToggle, sessionMap }: { item: Alarm; onToggle: (id: string, enabled: boolean) => void; sessionMap: SessionMap }) {
  const c = useColors();
  const { hour, ampm } = formatTime(item.next_fire_at);
  const color = item.enabled ? c.fg : c.fgFaint;
  const dimColor = item.enabled ? c.fgDim : c.borderMid;
  const router = useRouter();
  const session = sessionMap[item.mantra_id];
  const soundName = session?.title || "Default";
  const duration = session ? `${Math.round(session.duration_sec / 60)} min` : "10 min";

  return (
    <Pressable onPress={() => router.push(`/edit-alarm?id=${item.id}` as any)} style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color }]}>{hour}</Text>
          <Text style={[styles.ampm, { color }]}>{ampm}</Text>
        </View>
        <Text style={[styles.label, { color: dimColor }]}>
          {item.label || "Alarm"}
        </Text>
        <Text style={[styles.sublabel, { color: dimColor }]}>
          {soundName} · {duration}
        </Text>
      </View>
      <Switch
        value={item.enabled}
        onValueChange={(val) => onToggle(item.id, val)}
        trackColor={{ true: c.switchOn, false: c.switchOff }}
        thumbColor="#ffffff"
      />
    </Pressable>
  );
}

export default function AlarmsScreen() {
  const { alarms, loading, toggle } = useAlarms();
  const { sessions } = useSessions();
  const c = useColors();
  const router = useRouter();

  const sessionMap: SessionMap = {};
  for (const s of sessions) sessionMap[s.id] = s;

  return (
    <View style={[styles.container, { backgroundColor: c.bgDeep }]}>
      <View style={styles.section}>
        <View style={[styles.separator, { backgroundColor: c.borderMid }]} />

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={c.fgDim} />
          </View>
        ) : alarms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: c.fgFaint }]}>
              No alarms yet. Use the chat or tap + to create one.
            </Text>
          </View>
        ) : (
          <FlatList
            data={alarms}
            keyExtractor={(a) => a.id}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.borderMid }]} />}
            renderItem={({ item }) => (
              <AlarmRow item={item} onToggle={toggle} sessionMap={sessionMap} />
            )}
            ListFooterComponent={() => <View style={[styles.separator, { backgroundColor: c.borderMid }]} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowLeft: {
    flex: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  time: {
    fontSize: 56,
    fontFamily: F.light,
    letterSpacing: -2,
  },
  ampm: {
    fontSize: 24,
    fontFamily: F.light,
    marginLeft: 2,
  },
  label: {
    fontSize: 15,
    marginTop: -2,
    fontFamily: F.regular,
  },
  sublabel: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: F.regular,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    fontFamily: F.regular,
  },
});
