# QUE — Master App Context

> This file is the canonical source of truth for the autonomous agent. It is read at the start of every scheduled run. Edit this file when the vision changes; the agent will pick up changes on the next run.
>
> Last updated: 2026-04-18

## The app in one sentence

Que wakes you up with a personalized audio hypnotherapy session — delivered in the theta state (that half-asleep, half-awake window) — that primes your mindset for the day based on what you're personally working on.

## The core insight

Most alarm apps assault you awake with jarring noise. You hit snooze because your body resists the shock. Que does the opposite: it meets you in the theta state — the dreamlike window right after the alarm where the brain is most neurologically receptive to suggestion — and uses that moment to install positive programming for the day ahead. No snooze needed because you're not being attacked. You're being guided.

This is grounded in real neuroscience (theta brainwave receptivity) and hypnotherapy methodology. That's not a gimmick — it's the product's intellectual foundation and should be reflected in all copy.

## The analogy

"If Audible and your standard alarm app had a baby." Audio-first. Intentional. Personal. Calm but powerful.

## Platform & business model

- **Platforms:** iOS + Android (cross-platform, Expo)
- **Model:** Freemium

### Free tier
- 3 preset programs (suggested: General Morning Mindset, Focus & Productivity, Reduce Anxiety)
- Daily rotation within those 3 programs so it feels fresh
- Full alarm functionality
- Enough to build the habit — not crippled, genuinely useful

### Que Premium
- Full program library (see categories below)
- Custom session generation ("Create a session just for me") — real-time ElevenLabs generation personalized to the user's specific goal
- New programs added monthly
- Suggested pricing: **$7.99/month or $49.99/year**

### Upsell triggers
1. "Create my session" button → premium prompt (primary trigger, highest conversion — user is already reaching for more)
2. Soft nudge after 7 days of use (not a hard paywall — a gentle prompt showing what premium unlocks)

Never hard-paywall after trial. Trust must be earned first.

## Onboarding flow

A critical part of the product. Onboarding must capture:

1. The user's name (for personalized morning address: "Good morning, Michael")
2. Their primary "thing" — what they're working on (see categories below)
3. Preferred wake-up time
4. A preview of what the experience sounds like (sell the concept before they've committed)

## Program categories (ElevenLabs audio to generate)

### Focus & Productivity
- Deep Focus & Flow State
- Stop Wasting Time on Social Media
- Beat Procrastination

### Health & Habits
- Stop Eating Sugary Sweets
- Quit Vaping / Nicotine
- Quit Smoking
- Reduce Alcohol / Support Sobriety
- Build a Consistent Exercise Habit

### Mental & Emotional
- Reduce Anxiety
- Reduce Social Anxiety
- Build Confidence
- Improve Sleep Quality

### Spiritual / Purpose-driven
- Morning Prayer (Lord's Prayer)
- AA / Recovery Mantra (Serenity Prayer + affirmations)
- Gratitude & Abundance Mindset

### General (free tier)
- General Morning Mindset
- High Performer Daily Activation
- Calm & Centered Start

## Audio strategy (v1 launch)

**Do NOT generate audio in real-time for all users at launch** — ElevenLabs costs per character and scale kills the margin.

**v1 approach:**
- 1 pre-generated session per category = ~10 total audio files to start
- Store in Supabase storage, reference via database
- Expand library in later versions once the model is validated

**Custom real-time generation = premium feature only** (user's specific inputs fed into ElevenLabs at generation time).

### Voice profile
Calm, measured, warm but authoritative. Think guided meditation crossed with a confident coach. Not robotic. Not over-performed. Present. Slow enough to meet someone still half-asleep.

### Ambient background audio
Audio sessions are NOT just a voice. They layer:

1. Voice (ElevenLabs generated hypnotherapy script)
2. Ambient background sound (user-selectable)

**Background sound options to build (source or generate):**
- Gentle rain
- Soft ocean waves
- Morning birds / nature
- Tibetan singing bowl fade-in
- Low binaural hum (theta frequency, ~4–7Hz — matches the brain state)
- Silence (for users who want voice only)

The background sound is a user preference set in the app — they pick their ambient environment and it underlays every session. This is a UI setting, not per-session. Check if ElevenLabs has ambient/soundscape capability; if not, source royalty-free audio files and store in Supabase alongside voice files. Mix at roughly **80% voice / 20% ambient** at default.

## Tech stack

- **Backend:** Supabase (database + storage + auth)
- **Audio generation:** ElevenLabs API
- **AI content:** Claude API (generate hypnotherapy scripts before TTS)
- **Platform:** iOS + Android via Expo SDK 51 / Expo Router / TypeScript / NativeWind
- **Dummy data:** already populated in Supabase

## App Store details

- **App Name:** Que (locked during agent work — if changed, update this file)
- **Category:** Health & Fitness (primary) / Productivity (secondary)
- **Platform:** iOS + Android
- **Audience:** Ambitious, self-improving people — high performers, habit builders, people in recovery, spiritually motivated individuals, anyone who wants to own their morning

## Tone & voice guide

All copy — App Store listing, onboarding, UI text, audio scripts — should feel:

- Confident, not aggressive
- Warm, not soft
- Direct, not clinical
- Premium, not corporate

**Avoid:** "wellness," "journey," "transform your life," generic self-help language. That's noise. Que speaks plainly and powerfully.

- **Good example:** "Your morning sets everything. Que makes sure it counts."
- **Bad example:** "Begin your transformative wellness journey today!"

## What's done

- Core app built (Expo, drawer nav, 5 screens)
- Supabase configured with dummy data
- Basic alarm functionality in place

## What's not done (agent's working territory)

- ElevenLabs integration (Claude generates script → ElevenLabs → Supabase)
- Onboarding flow capturing user's "thing"
- Full program library audio files
- App Store content (name, subtitle, description, keywords, screenshots spec)
- Privacy policy
- Support page copy
- Apple Developer Program enrollment (**human-only**)
- Google Play Developer enrollment (**human-only**)
- App Store Connect setup (**human-only**)
- Final submission (**human-only**)

## Checklist — current state

Mirrors the launch checklist. Agent should read `QUE-STATUS.md` for the live per-item state and update it each run.

### Phase 01 — Core App
- [x] App built and functional
- [x] Supabase backend configured
- [x] Dummy data populated
- [ ] ElevenLabs integration — generate motivational audio files via Claude
- [ ] Replace dummy data with real generated audio content
- [ ] Alarm trigger plays correct audio reliably
- [ ] Background audio works when app is closed (iOS background modes)
- [ ] Edge cases handled — no alarm, late permissions, silent mode

### Phase 02 — App Polish
- [ ] Onboarding flow for new users
- [ ] Push notification permissions requested gracefully
- [ ] Empty states designed (no alarms set, etc.)
- [ ] Crash-free on iPhone and iPad — tested on real devices *(human-only)*
- [ ] Dark mode support
- [ ] Accessibility pass — Dynamic Type, VoiceOver basics

### Phase 03 — App Store Content
- [ ] Final app name locked — Cue / Que / Quake / Arma
- [ ] App Store subtitle (30 chars max)
- [ ] Full App Store description (4000 chars)
- [ ] Keywords field (100 chars max, comma-separated)
- [ ] Promotional text (170 chars — updatable without resubmit)
- [ ] Screenshots — 6.9" iPhone, 6.5" iPhone, 12.9" iPad (if supported)
- [ ] App preview video (optional — 15–30 sec)
- [ ] App icon — 1024×1024px, no alpha channel
- [ ] Privacy policy URL — hosted online
- [ ] Support URL — even a simple landing page works
- [ ] Category selected — Health & Fitness or Productivity
- [ ] Age rating questionnaire completed *(human-only)*

### Phase 04 — Apple Developer
- [ ] Apple Developer Program enrolled ($99/yr) *(human-only)*
- [ ] Bundle ID registered in App Store Connect *(human-only)*
- [ ] App record created in App Store Connect *(human-only)*
- [ ] Distribution certificate and provisioning profile set up in Xcode
- [ ] Required capabilities enabled — background audio, notifications
- [ ] Entitlements file correct for all capabilities used

### Phase 05 — Submission
- [ ] Archive built in Xcode (Product → Archive)
- [ ] Archive validated — no errors in Organizer
- [ ] Build uploaded to App Store Connect via Xcode Organizer
- [ ] Build selected in App Store Connect listing *(human-only)*
- [ ] Review notes written for App Review team
- [ ] Submitted for App Review *(human-only)*
- [ ] App approved
- [ ] App live on the App Store

---

*The agent's detailed operating instructions live in `QUE-AGENT-PROTOCOL.md`. Per-run state lives in `QUE-STATUS.md`. Human-only blockers live in `QUE-BLOCKERS.md`.*
