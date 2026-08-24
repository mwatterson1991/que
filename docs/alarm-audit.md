# Alarm Reliability Audit — Que
_Last updated: 2026-05-20_

---

## Executive Summary

**The alarm does not fire. At all.**

`expo-notifications` is installed but never called. No notification is ever
scheduled when a user creates an alarm. No background task is registered. No
notification handler is wired up. Alarms exist only as rows in Supabase.

---

## Current State (pre-fix)

### What exists
| Component | Status |
|---|---|
| `expo-notifications` package | ✅ Installed (0.28.19) |
| `expo-av` audio engine | ✅ Installed, partially configured |
| `UIBackgroundModes: ["audio","fetch"]` in app.json | ✅ Present |
| `SCHEDULE_EXACT_ALARM` in Android manifest | ✅ Present |
| Alarm CRUD in Supabase | ✅ Working |
| Notification permission request | ❌ Never called |
| Notification scheduling on alarm save | ❌ Never called |
| Notification cancellation on alarm delete/disable | ❌ Never called |
| Notification response handler (tap → open app) | ❌ Never called |
| Foreground notification handler | ❌ Never called |
| Android notification channel setup | ❌ Never called |
| Background task / TaskManager | ❌ Not installed |
| Audio auto-start on alarm fire | ❌ Not possible (see below) |

### What the audio module does
`lib/audio.ts` calls `Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true })`.
This is correct config for ACTIVE playback but does nothing at alarm-fire time
since nothing triggers it.

---

## Gap Analysis: Current vs Production

### iOS

| Requirement | Current | Needed |
|---|---|---|
| Fire when app is open | ❌ | `scheduleNotificationAsync` + foreground handler |
| Fire when app is backgrounded | ❌ | Same — OS delivers local notification |
| Fire when app is killed | ❌ | Same — OS delivers local notification |
| Fire in silent mode | ❌ | **Critical Alerts entitlement** (see TODO) |
| Fire in Do Not Disturb | ❌ | `interruptionLevel: 'timeSensitive'` bypasses Focus; DND fully blocked without Critical Alerts |
| Auto-play full session audio | ❌ | **Not possible when app is killed** on iOS (OS restriction). User must tap notification to open app, which then starts audio. This is how Calm, Headspace, and all third-party alarm apps work. |
| Custom alarm chime in notification | ❌ | Bundle a short `.aiff`/`.caf` (< 30 sec) and reference in notification sound |

**Critical Alerts:**
This entitlement allows the alarm to bypass silent switch AND DND. It's used by
the Clock app, medical devices, and emergency apps. Requires Apple approval via
a form at developer.apple.com/contact/request/notifications-critical-alerts-entitlement.
**TODO: Submit Critical Alerts entitlement request** — needs developer account
access. Once approved, add `"critical": true` to notification content and set
`"entitlements": { "com.apple.developer.usernotifications.critical-alerts": true }` in app.json.

### Android

| Requirement | Current | Needed |
|---|---|---|
| Fire when app is open | ❌ | Notification channel + scheduling |
| Fire when app is backgrounded | ❌ | Same |
| Fire when app is killed | ❌ | Same + exact alarm permissions |
| Bypass DND | ❌ | Channel with `bypassDnd: true` + `PRIORITY_MAX` |
| Exact timing | ❌ | `SCHEDULE_EXACT_ALARM` permission (already in manifest) |
| Auto-play audio | ❌ | Foreground service required for reliable background audio — not yet implemented |

---

## Approach Chosen

**Local notifications via `expo-notifications` with `scheduleNotificationAsync`.**

Alternatives considered:
- Push notifications (server-triggered): requires backend infra, network at fire time, can be throttled by Apple/Google. Worse reliability than local.
- `expo-background-fetch`: iOS gives ~30 seconds of background time, not reliable for exact timing.
- Native module (react-native-alarm-notification): works but requires ejecting from managed Expo — too early for this stage.

**Decision:** Local notifications with `interruptionLevel: 'timeSensitive'` on iOS
and `bypassDnd: true` on Android. This is App Store compliant, no special
entitlement needed, same approach used by Calm, Headspace, Sleep Cycle.

**Silent mode limitation:** Without Critical Alerts, the alarm WILL be silenced
by the mute switch on iOS. This is a known limitation of all third-party
non-Clock alarm apps. User education ("keep phone off mute for alarms") +
Critical Alerts entitlement request is the correct path forward.

---

## What Changed (post-fix)

1. **`lib/alarmScheduler.ts`** — new module
   - `requestAlarmPermissions()` — requests notification permissions
   - `scheduleAlarm(alarm)` — schedules a local notification using alarmId as identifier
   - `cancelAlarm(alarmId)` — cancels scheduled notification by alarmId
   - `rescheduleAll(alarms)` — cancels all, reschedules enabled ones (called on app start)
   - Android channel `que-alarms` created with `IMPORTANCE_MAX`, `bypassDnd: true`

2. **`app/_layout.tsx`**
   - Notification handler set at module level (required before any notification fires)
   - `requestAlarmPermissions()` called on app start
   - `addNotificationResponseReceivedListener` — tap on notification navigates to player
   - `addNotificationReceivedListener` — foreground notification intercepted and shown as in-app alert

3. **`app/edit-alarm.tsx`**
   - `scheduleAlarm(alarm)` called after save (new + update)
   - Old notification cancelled before rescheduling on edit

4. **`app/(drawer)/alarms.tsx`**
   - `cancelAlarm(alarmId)` called on delete
   - `cancelAlarm` + `scheduleAlarm` called on toggle (enable/disable)

5. **`app/alarm-debug.tsx`** — new debug screen
   - Buttons: +1 min, +5 min, +30 min, +2 hr test alarms
   - Shows currently scheduled notifications
   - Permission status display

---

## What to Test Tonight

| Test | Expected | Pass? |
|---|---|---|
| Set +1min alarm in debug screen, lock phone | Notification fires, sound plays | ? |
| Set +1min alarm, put in DND | Fires (pops through as Time Sensitive on iOS 15+) | ? |
| Set +1min alarm, flip mute switch | **Will NOT fire sound** (expected — no Critical Alerts) | ? |
| Tap fired notification | App opens, navigates to player screen | ? |
| Set alarm, kill app, wait | Notification fires | ? |
| Disable alarm toggle | Notification cancelled, does NOT fire | ? |
| Delete alarm | Notification cancelled | ? |
| Set repeat alarm (daily) | Refires next day at same time | ? |

---

## Remaining Unknowns / TODOs

- [ ] **Critical Alerts entitlement** — submit request to Apple. Requires developer account. Unblocks silent mode + DND bypass.
- [ ] **Custom alarm chime** — bundle a short `.aiff` (< 30 sec) for the notification sound. Current impl uses system default.
- [ ] **Android foreground service** — for reliable auto-play of session audio when app is killed on Android. Requires `expo-task-manager` + foreground service config.
- [ ] **Repeat alarms** — daily repeat implemented via re-scheduling after fire. Needs device verification.
- [ ] **Snooze** — not yet implemented.
- [ ] **Audio auto-play when notification tapped** — currently navigates to player but does NOT auto-start audio. Add auto-play on `?autoplay=1` param.
