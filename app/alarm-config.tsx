import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Image, Alert } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAlarms, useSessions, useHabits } from "@/lib/useSupabase";
import { rollForward, scheduleAlarm, cancelAlarm } from "@/lib/alarmScheduler";
import { artworkFor } from "@/lib/catalog";
import { consumePickedSound } from "@/lib/soundPicker";
import { WheelColumn, HOURS, MINUTES, MERIDIEM } from "@/components/TimeWheel";
import AuroraBackground from "@/components/AuroraBackground";
import { F, S } from "@/lib/fonts";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

// Setting an alarm is the moment habits make sense — you've just decided what
// tomorrow morning looks like. But it's a nudge, not a nag: it appears only for
// someone with zero habits, and only ever once.
const HABIT_PROMPT_KEY = "habit_prompt_shown_v1";

// The alarm's own page — one glass layer never sits over another.
// Cards on the list are glass; this page is a PLACE, its controls flat
// on the aurora, so tapping an alarm travels rather than stacks.
export default function AlarmConfigScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { alarms, add, update, remove } = useAlarms();
  const { sessions } = useSessions();
  const { habits, loading: habitsLoading } = useHabits();

  const existing = alarms.find((a) => a.id === id);
  const isNew = !existing;

  const [hourIdx, setHourIdx] = useState(5); // 6 o'clock
  const [minIdx, setMinIdx] = useState(30);
  const [merIdx, setMerIdx] = useState(0); // AM
  const [sessionId, setSessionId] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate form once from the alarm (or defaults for a new one)
  useEffect(() => {
    if (hydrated) return;
    if (existing) {
      const d = new Date(existing.next_fire_at);
      const h12 = d.getHours() % 12 || 12;
      setHourIdx(h12 - 1);
      setMinIdx(d.getMinutes());
      setMerIdx(d.getHours() >= 12 ? 1 : 0);
      setSessionId(existing.mantra_id);
      setHydrated(true);
    } else if (id === undefined && sessions.length > 0) {
      setSessionId((sessions.find((s) => s.tier === "free") ?? sessions[0]).id);
      setHydrated(true);
    }
  }, [existing, hydrated, id, sessions]);

  // Sound picked from /sounds on the way back
  useFocusEffect(
    useCallback(() => {
      const picked = consumePickedSound();
      if (picked) setSessionId(picked);
    }, [])
  );

  const session = sessions.find((s) => s.id === sessionId);

  useEffect(() => {
    navigation.setOptions({ title: isNew ? "New Alarm" : "Alarm" });
  }, [navigation, isNew]);

  const save = async () => {
    let h = hourIdx + 1;
    if (merIdx === 1 && h < 12) h += 12;
    if (merIdx === 0 && h === 12) h = 0;
    const fire = new Date();
    fire.setHours(h, minIdx, 0, 0);
    if (fire.getTime() <= Date.now()) fire.setDate(fire.getDate() + 1);
    const label = session?.title ?? existing?.label ?? "Alarm";

    if (existing) {
      await cancelAlarm(existing.id);
      const { data: updated } = await update(existing.id, {
        label,
        mantra_id: sessionId,
        next_fire_at: fire.toISOString(),
      });
      if (updated?.enabled) {
        await scheduleAlarm({ ...updated, next_fire_at: rollForward(updated) });
      }
    } else {
      await add({
        label,
        mantra_id: sessionId,
        next_fire_at: fire.toISOString(),
        repeat_days: [],
        enabled: false,
      });
    }
    Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success);
    await leaveAfterSave();
  };

  // Leaving the screen after a save — with one optional detour.
  const leaveAfterSave = async () => {
    // Anyone already tracking habits knows the loop; don't explain it again.
    // While habits are still loading we can't tell, so we stay silent.
    if (habitsLoading || habits.length > 0) { router.back(); return; }
    if (await AsyncStorage.getItem(HABIT_PROMPT_KEY)) { router.back(); return; }
    // Written before showing, so a force-quit mid-prompt still burns the one shot.
    await AsyncStorage.setItem(HABIT_PROMPT_KEY, "1");

    Alert.alert(
      "Alarm set",
      "Add a habit to track each morning — every one you complete raises your positivity score.",
      [
        { text: "Not now", style: "cancel", onPress: () => router.back() },
        // Pushed, not replaced: backing out of habit-add returns you to the
        // alarm you just made, then to the list.
        { text: "Track a habit", onPress: () => router.push("/habit-add" as any) },
      ],
    );
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert("Delete alarm?", existing.label ?? "This alarm", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await cancelAlarm(existing.id);
          await remove(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AuroraBackground dim={0.8} />

      {/* Sound — tap to change */}
      <Pressable
        onPress={() => router.push(`/sounds?current=${sessionId}` as any)}
        style={styles.soundRow}
        accessibilityRole="button"
        accessibilityLabel={session ? `Wake-up sound, ${session.title}. Change sound` : "Choose sound"}
      >
        {session ? (
          <Image source={{ uri: artworkFor(session) }} style={styles.art} resizeMode="cover" />
        ) : (
          <View style={[styles.art, styles.artEmpty]}>
            <Ionicons name="add" size={22} color="#ffffff" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.soundTitle} numberOfLines={1}>
            {session?.title ?? "Choose sound"}
          </Text>
          {session && (
            <Text style={styles.soundMeta}>
              {session.category} · {Math.round(session.duration_sec / 60)} min
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
      </Pressable>

      {/* Time wheel */}
      <View style={styles.wheelWrap} accessible accessibilityLabel="Alarm time">
        <View style={styles.wheelHighlight} />
        <View style={styles.wheelColumns}>
          <WheelColumn data={HOURS} selected={hourIdx} onSelect={setHourIdx} width={52} label="Hour" light />
          <Text style={styles.wheelColon}>:</Text>
          <WheelColumn data={MINUTES} selected={minIdx} onSelect={setMinIdx} width={52} label="Minute" light />
          <WheelColumn data={MERIDIEM} selected={merIdx} onSelect={setMerIdx} width={52} label="AM or PM" light />
        </View>
      </View>

      {/* Save + delete */}
      <View style={styles.footer}>
        <Pressable
          onPress={save}
          style={({ pressed }) => [styles.saveButton, pressed && { transform: [{ scale: 0.98 }] }]}
          accessibilityRole="button"
          accessibilityLabel="Save alarm"
        >
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
        {!isNew && (
          <Pressable
            onPress={confirmDelete}
            style={styles.deleteButton}
            accessibilityRole="button"
            accessibilityLabel="Delete alarm"
          >
            <Text style={styles.deleteText}>Delete alarm</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020805",
    padding: 20,
  },
  soundRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.18)",
    paddingBottom: 18,
  },
  art: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  artEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  soundTitle: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
  soundMeta: {
    color: "rgba(255,255,255,0.65)",
    fontSize: S.caption,
    fontFamily: F.regular,
    marginTop: 2,
  },
  wheelWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  wheelHighlight: {
    position: "absolute",
    alignSelf: "center",
    width: 210,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  wheelColumns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  wheelColon: {
    color: "#ffffff",
    fontSize: S.title,
    fontFamily: F.regular,
  },
  footer: {
    paddingBottom: 12,
    gap: 4,
  },
  saveButton: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveText: {
    color: "#0a0a0a",
    fontSize: S.body,
    fontFamily: F.semibold,
    letterSpacing: 0.3,
  },
  deleteButton: {
    alignItems: "center",
    paddingVertical: 14,
  },
  deleteText: {
    color: "#ff6b6b",
    fontSize: S.secondary,
    fontFamily: F.regular,
  },
});
