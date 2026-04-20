# QUE — Live Status

> The agent updates this file every run. Michael marks items `[x]` after merging a PR.
>
> Legend: `[ ]` not started · `[~]` in progress (auto-branch exists) · `[✴]` PR open, awaiting review · `[x]` merged / complete · `[🚫]` blocked (see QUE-BLOCKERS.md)

Last agent run: 2026-04-20 16:30

## Checklist state

### Phase 01 — Core App
- [x] App built and functional
- [x] Supabase backend configured
- [x] Dummy data populated
- [✴] ElevenLabs integration — generate motivational audio files via Claude → scripts done [PR #25](https://github.com/mwatterson1991/que/pull/25); TTS blocked on API keys
- [ ] Replace dummy data with real generated audio content
- [ ] Alarm trigger plays correct audio reliably
- [ ] Background audio works when app is closed (iOS background modes)
- [ ] Edge cases handled — no alarm, late permissions, silent mode

### Phase 02 — App Polish
- [ ] Onboarding flow for new users
- [ ] Push notification permissions requested gracefully
- [ ] Empty states designed (no alarms set, etc.)
- [🚫] Crash-free on iPhone and iPad — tested on real devices *(human-only)*
- [ ] Dark mode support
- [ ] Accessibility pass — Dynamic Type, VoiceOver basics

### Phase 03 — App Store Content
- [ ] Final app name locked — Cue / Que / Quake / Arma
- [ ] App Store subtitle (30 chars max)
- [ ] Full App Store description (4000 chars)
- [ ] Keywords field (100 chars max, comma-separated)
- [ ] Promotional text (170 chars — updatable without resubmit)
- [✴] Screenshots — 6.9" iPhone, 6.5" iPhone, 12.9" iPad (if supported) → [PR #20](https://github.com/mwatterson1991/que/pull/20)
- [ ] App preview video (optional — 15–30 sec)
- [✴] App icon — 1024×1024px, no alpha channel → [PR #19](https://github.com/mwatterson1991/que/pull/19)
- [ ] Privacy policy URL — hosted online
- [ ] Support URL — even a simple landing page works
- [ ] Category selected — Health & Fitness or Productivity
- [🚫] Age rating questionnaire completed *(human-only)*

### Phase 04 — Apple Developer
- [🚫] Apple Developer Program enrolled ($99/yr) *(human-only)*
- [🚫] Bundle ID registered in App Store Connect *(human-only)*
- [🚫] App record created in App Store Connect *(human-only)*
- [ ] Distribution certificate and provisioning profile set up in Xcode
- [ ] Required capabilities enabled — background audio, notifications
- [ ] Entitlements file correct for all capabilities used

### Phase 05 — Submission
- [ ] Archive built in Xcode (Product → Archive)
- [ ] Archive validated — no errors in Organizer
- [ ] Build uploaded to App Store Connect via Xcode Organizer
- [🚫] Build selected in App Store Connect listing *(human-only)*
- [ ] Review notes written for App Review team
- [🚫] Submitted for App Review *(human-only)*
- [ ] App approved
- [ ] App live on the App Store

## Open auto-branches

- `auto/agent-20260419-1700-app-icon` → [PR #19](https://github.com/mwatterson1991/que/pull/19) — App icon
- `auto/agent-20260420-1630-hypnotherapy-scripts` → [PR #25](https://github.com/mwatterson1991/que/pull/25) — 13 hypnotherapy scripts for TTS pipeline
- `auto/agent-20260419-1217-appstore-screenshots` → [PR #20](https://github.com/mwatterson1991/que/pull/20) — App Store screenshots

## Run journal

## 2026-04-20 16:30 local time
- **Task:** ElevenLabs integration — generate motivational audio files via Claude (script generation slice)
- **Branch:** `auto/agent-20260420-1630-hypnotherapy-scripts`
- **PR:** #25 — https://github.com/mwatterson1991/que/pull/25
- **Summary:** Generated 13 complete hypnotherapy scripts covering all program categories (Focus, Health, Mental, Spiritual, General free-tier) plus a manifest.json mapping each script to its category, tier, and metadata. These are the full Claude-authored scripts ready for ElevenLabs TTS once API keys are provided.
- **Next:** Once Michael adds ElevenLabs + Anthropic API keys to `.env` (blocker #4), a future run can wire up the TTS pipeline to convert these scripts to audio and upload to Supabase storage.

## 2026-04-19 12:20 local time
- **Task:** Screenshots — 6.9" iPhone, 6.5" iPhone, 12.9" iPad (if supported)
- **Branch:** `auto/agent-20260419-1217-appstore-screenshots`
- **PR:** #20 — https://github.com/mwatterson1991/que/pull/20
- **Summary:** Generated 15 marketing-style App Store screenshots (5 slides × 3 device sizes) using Swift/Core Graphics, matching Que's brand palette and showcasing hero, chat, alarms, programs, and ambient sound features.
- **Next:** If Michael wants different copy, layout tweaks, or additional slides, edit the `screenshots` array in `scripts/generate-screenshots.swift` and re-run.

## 2026-04-19 17:00 local time
- **Task:** App icon — 1024×1024px, no alpha channel
- **Branch:** `auto/agent-20260419-1700-app-icon`
- **PR:** #19 — https://github.com/mwatterson1991/que/pull/19
- **Summary:** Generated a geometric Q letterform icon in the brand accent purple on dark background using Swift/Core Graphics, plus Android adaptive icon foreground; wired both into app.json.
- **Next:** None — icon is complete pending review. If Michael wants a different design direction, the Swift scripts in `scripts/` can be tweaked and re-run.

---

<!-- AGENT: prepend new journal entries above this line, using this template:

## YYYY-MM-DD HH:MM local time
- **Task:** <checklist item label>
- **Branch:** `auto/agent-YYYYMMDD-HHMM-<slug>`
- **PR:** #<number> — <url>
- **Summary:** <one sentence>
- **Next:** <what a future run should pick up, if anything>

-->
