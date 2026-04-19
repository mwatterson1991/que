# App Review Notes for Que

> These notes are for the Apple App Review team. Copy the relevant sections
> into the "Notes" field in App Store Connect when submitting the build.

---

## What Que does

Que is a mindful alarm clock that plays guided audio sessions when the alarm
fires. Instead of a jarring ringtone, users wake to a calm, spoken
hypnotherapy-style session designed to set a positive mindset for the day.
Users can browse a library of session categories (focus, anxiety, confidence,
recovery, and more) and assign one to their alarm.

## How to test the app

### Account creation

1. Open the app. You will see the sign-up / login screen.
2. Create an account using any valid email address and a password.
3. After signing in you land on the home screen (the chat interface).

### Setting an alarm

1. Tap the drawer menu (top-left) and select **Alarms**.
2. Tap the "+" button or use the home chat screen to create a new alarm
   (e.g., type "wake me at 7:00 AM").
3. Choose a session/mantra from the sound library to attach to the alarm.
4. Toggle the alarm on.
5. When the alarm fires at the scheduled time, the selected audio session
   plays automatically.

### Browsing audio sessions

1. From the drawer menu, select **Sounds**.
2. Browse the available sessions by category.
3. Tap any session to preview it in the player screen.

### Profile and settings

1. From the drawer, tap **Profile** to view your stats (streak, sessions
   completed, total hours).
2. Tap **Settings** to adjust preferences.

### Voice input (optional)

On the home chat screen, tap the microphone icon to speak a request instead
of typing. The app uses on-device speech recognition to parse your input.

## Permissions requested

| Permission | Platform | Why |
|---|---|---|
| Microphone | iOS, Android | Voice input for creating alarms via natural language |
| Speech Recognition | iOS | On-device transcription of voice commands |
| Notifications | iOS, Android | Firing alarms at the scheduled time |
| Background Audio | iOS | Continuing audio playback when the screen locks or the user switches apps |
| Exact Alarm Scheduling | Android | Ensuring alarms fire at the precise requested time |
| Wake Lock | Android | Keeping the device awake while an alarm session plays |

## Third-party services

| Service | Purpose |
|---|---|
| Supabase | User authentication, database, and audio file storage |
| ElevenLabs (planned) | Text-to-speech generation of audio sessions (premium feature, not active at launch) |

## Demo account

If you prefer not to create an account, you may use this demo credential:

- **Email:** review@queapp.co
- **Password:** QueReview2026!

> **Note to developer:** Create this demo account in Supabase before
> submission. Populate it with at least one saved alarm so the reviewer sees
> a non-empty state.

## Content and age rating

- The app contains no user-generated content visible to other users.
- Audio sessions contain positive affirmations and guided relaxation only.
  There is no violent, sexual, or objectionable content.
- One session category references recovery (AA / Serenity Prayer). This is
  supportive wellness content, not medical advice.
- The app does not include gambling, contests, or in-app purchases at
  launch. A subscription offering (Que Premium) may be added in a future
  update.

## Background audio

The app declares the `audio` background mode. This is required so that alarm
audio sessions continue playing when the user locks their screen or switches
to another app. The audio does not play indefinitely — each session has a
fixed duration (typically 3 to 10 minutes) and stops automatically when
complete.

## Privacy

- User data (email, profile name, alarm settings) is stored in Supabase and
  is not shared with third parties.
- Voice input is processed on-device via Apple's Speech framework. Audio is
  not recorded, stored, or transmitted.
- The privacy policy is available at the URL provided in the App Store
  listing.
