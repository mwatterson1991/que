# Mantra Alarm

A voice-driven alarm clock with a chat interface. Tell it `"wake me up tomorrow at 7am with a focus mantra"` and it schedules an alarm that plays a mantra audio clip when it fires.

**Stack:** Expo SDK 51 · Expo Router (drawer nav) · TypeScript · NativeWind (Tailwind) · Supabase · expo-av · expo-speech-recognition · expo-notifications

## Screens

The app uses a left drawer (like Claude / ChatGPT) with five entries:

1. **Chat** (`app/(drawer)/index.tsx`) — main screen, free-text + mic input, parses utterances into alarms
2. **Alarms** (`app/(drawer)/alarms.tsx`) — list, toggle, delete
3. **Search** (`app/(drawer)/search.tsx`) — browse and preview the mantra library
4. **Create** (`app/(drawer)/create.tsx`) — manual alarm form
5. **Profile** (`app/(drawer)/profile.tsx`) — Supabase magic-link sign in

---

## 1. First-time setup (one-time, ~10 minutes)

### Install Node + the Expo CLI
```bash
# macOS — install Node via Homebrew if you don't have it
brew install node
npm install -g expo-cli eas-cli
```

### Install dependencies
```bash
cd mantra-alarm
npm install
```

### Add audio files
Drop three short `.mp3`s into `assets/audio/` named `focus.mp3`, `calm.mp3`, `energy.mp3`. Anything from freesound.org or pixabay.com works while you're prototyping.

### Create your Supabase project
1. Sign up at https://supabase.com and create a new project (free tier is fine).
2. In the dashboard go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.
3. Copy `.env.example` to `.env` and paste them in:
   ```bash
   cp .env.example .env
   # then edit .env
   ```
4. In the Supabase dashboard go to **SQL → New query**, paste the contents of `supabase/schema.sql`, and run it. This creates the `alarms` and `chat_messages` tables with row-level security.

---

## 2. Run it on your phone

1. Install **Expo Go** from the App Store / Play Store on your phone.
2. Make sure your phone and laptop are on the same Wi-Fi.
3. From the project folder:
   ```bash
   npm start
   ```
4. Scan the QR code that appears in your terminal — iPhone uses the Camera app, Android uses the Expo Go app's built-in scanner.
5. The app loads on your phone and hot-reloads as you (or Claude) edit files.

> **Note on voice + alarms in Expo Go:** Expo Go supports microphone and audio playback out of the box. For real background alarms (firing while the app is closed) you'll eventually need to make a development build with `npx expo prebuild && eas build --profile development`. Until then, alarms work while the app is open.

---

## 3. Push to a new private GitHub repo

From inside the project folder:

```bash
git init
git add .
git commit -m "Initial commit: Mantra Alarm scaffold"

# Create the repo on GitHub (requires the gh CLI: https://cli.github.com)
gh repo create mantra-alarm --private --source=. --remote=origin --push
```

If you don't have `gh`, do it the manual way:
1. Create an empty private repo on github.com (no README/license).
2. Then:
   ```bash
   git remote add origin git@github.com:michaelgwatterson/mantra-alarm.git
   git branch -M main
   git push -u origin main
   ```

---

## 4. Iterate with Claude Code

Once it's pushed, the best workflow is:

```bash
cd mantra-alarm
claude
```

Then talk to Claude in the terminal: *"add a snooze button to the alarm screen"*, *"wire the chat history to Supabase"*, *"call OpenAI on the backend to parse alarm utterances better"*. Claude edits files, you watch them hot-reload on your phone, and you commit when each step is working.

---

## 5. Ship it to the App Store + Play Store

When you're ready:

```bash
eas login
eas build:configure
eas build --platform all       # builds signed iOS + Android binaries in the cloud
eas submit --platform all      # uploads them to App Store Connect + Play Console
```

You'll need:
- An **Apple Developer** account ($99/year) and an **App Store Connect** app record.
- A **Google Play Console** account ($25 one-time) and a Play Console app record.
- Privacy policy URL, screenshots, app icon, age rating — Claude can help draft most of these.

The first review (especially Apple's) usually takes 24–72 hours and may bounce back with feedback. That's normal.

---

## File map

```
mantra-alarm/
├── app.json                       Expo config + iOS/Android permissions
├── package.json
├── tsconfig.json
├── babel.config.js
├── tailwind.config.js
├── global.css
├── .env.example
├── app/
│   ├── _layout.tsx                Root stack
│   └── (drawer)/
│       ├── _layout.tsx            Drawer nav (5 entries)
│       ├── index.tsx              Chat (main)
│       ├── alarms.tsx
│       ├── search.tsx
│       ├── create.tsx
│       └── profile.tsx
├── lib/
│   ├── supabase.ts                Supabase client
│   ├── audio.ts                   Mantra registry + playback
│   ├── parseAlarm.ts              Utterance → Alarm
│   ├── store.ts                   In-memory state (swap for Zustand later)
│   └── types.ts
├── assets/audio/                  Drop your mantra .mp3 files here
└── supabase/schema.sql            Database schema + RLS policies
```
