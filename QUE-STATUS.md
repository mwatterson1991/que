# MORNING QUE — Live Status

> Rewritten 2026-08-22 after the great PR consolidation. Michael marks items `[x]` after merging.
>
> Legend: `[ ]` not started · `[✴]` PR open, awaiting review · `[x]` done · `[🚫]` blocked (see QUE-BLOCKERS.md)

## The only two PRs that matter

1. **[PR #32](https://github.com/mwatterson1991/que/pull/32)** — May local work (merge FIRST)
2. **[PR #33](https://github.com/mwatterson1991/que/pull/33)** — everything salvaged from the old 31-PR backlog, integrated (merge SECOND)

All 31 April PRs are closed with notes explaining where their work went.

## Checklist state

### Phase 01 — Core App
- [x] App built and functional
- [x] Supabase backend configured
- [✴] ElevenLabs pipeline ready (`scripts/generate-audio.mjs`) — PR #33
- [🚫] Real audio generated — 3/18 done, blocked on ElevenLabs quota (blocker #4)
- [✴] Alarm trigger plays audio with fade-in, preload, fallback — PR #33
- [✴] Background audio (iOS background modes + lifecycle module) — PR #33
- [x] Edge cases — permissions, silent mode, missing audio (May work, PR #32)

### Phase 02 — App Polish
- [x] Onboarding flow (May work, PR #32)
- [x] Notification permissions flow (May work, PR #32)
- [x] Empty states (May work, PR #32)
- [🚫] Crash-free on real devices *(human-only — TestFlight after Apple enrollment)*
- [ ] Dark mode — deferred, not a launch blocker (closed PR #7 has a reference ThemeProvider)
- [ ] Accessibility pass — re-apply fresh on current code (closed PR #8 targeted stale screens)

### Phase 03 — App Store Content
- [x] Final app name locked — **Morning Que** (bundle ID com.michaelwatterson.morningque)
- [✴] Subtitle, description, keywords, promo text — `appstore/` in PR #33
- [✴] Screenshots (3 device sizes) + preview video — PR #33
- [✴] App icon 1024×1024 — PR #33
- [🚫] Privacy policy URL — pages written + rebranded, awaiting hosting decision (blocker #3)
- [🚫] Support URL — same as above
- [x] Category selected — Health & Fitness (appstore/metadata.json)
- [🚫] Age rating questionnaire *(human-only)*

### Phase 04 — Apple Developer
- [🚫] Apple Developer Program enrolled *(human-only — blocker #1, START THIS FIRST)*
- [🚫] Bundle ID + app record in App Store Connect *(human-only, after enrollment)*
- [x] Capabilities enabled — background audio, notifications (app.json, PR #33)
- [x] Entitlements declared — time-sensitive notifications, aps-environment (PR #33)
- [x] EAS build + submit config (eas.json; Apple Team ID/ASC App ID placeholders remain)

### Phase 05 — Submission
- [ ] **Expo SDK upgrade 51 → current** — required; Apple's minimum-SDK rules will reject SDK 51 builds (expo-av → expo-audio migration is the main effort)
- [~] EAS iOS simulator build — first cloud build running (proves config)
- [ ] Production build via EAS (needs Apple credentials)
- [✴] Review notes written — docs/APP-REVIEW-NOTES.md in PR #33
- [🚫] Submit for App Review *(human-only)*

## After merging PR #33 — one-time setup

1. Run `supabase/migrations/2026-08-22-add-ambient-sound.sql` in the Supabase SQL editor (dashboard → SQL). The app's preferences now include `ambient_sound`.
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env` (dashboard → Settings → API) so the audio pipeline can upload.
3. EAS env vars for Supabase are already set (all three environments).

## Run journal

## 2026-08-22 (Claude Code session — the big catch-up)
- **Task:** Full inventory + consolidation after 3-month gap
- **Summary:** Committed May local work (PR #32). Triaged all 31 April PRs: closed every one with notes; salvaged alarm audio reliability, background audio, ambient subsystem, entitlements/capabilities, EAS config, App Store content, scripts + TTS pipeline into PR #33 (typecheck clean; fixed a latent transport-controls bug in alarm mode). Locked name as Morning Que. Generated 3/18 session audios (ElevenLabs quota exhausted). Set EAS env vars, started first cloud iOS build. Privacy/support pages rebranded and staged in ~/morningque-site awaiting hosting decision.
- **Next:** Michael: merge #32 → #33, enroll Apple Developer, upgrade ElevenLabs plan, decide privacy hosting. Agent: SDK 51→current upgrade, a11y pass, finish audio, production build.

*(Older journal: 90+ NO-OP entries from April–May trimmed — see git history of this file if you're nostalgic.)*
