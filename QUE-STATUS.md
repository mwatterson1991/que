# QUE — Live Status

> The agent updates this file every run. Michael marks items `[x]` after merging a PR.
>
> Legend: `[ ]` not started · `[~]` in progress (auto-branch exists) · `[✴]` PR open, awaiting review · `[x]` merged / complete · `[🚫]` blocked (see QUE-BLOCKERS.md)

Last agent run: 2026-04-18 20:30

## Checklist state

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
- [🚫] Crash-free on iPhone and iPad — tested on real devices *(human-only)*
- [✴] Dark mode support — [PR #7](https://github.com/mwatterson1991/que/pull/7)
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

- `auto/agent-20260418-1500-onboarding-flow` — PR #1
- `auto/agent-20260418-1530-notification-permissions` — PR #2
- `auto/agent-20260418-1630-alarm-scheduling` — PR #3
- `auto/agent-20260418-1730-background-audio` — PR #4
- `auto/agent-20260418-1830-edge-cases` — PR #5
- `auto/agent-20260418-1930-empty-states` — PR #6
- `auto/agent-20260418-2030-dark-mode` — PR #7

## Run journal

*(Most recent at top. Agent appends one entry per run.)*

## 2026-04-18 20:30
- **Task:** Dark mode support
- **Branch:** `auto/agent-20260418-2030-dark-mode`
- **PR:** #7 — https://github.com/mwatterson1991/que/pull/7
- **Summary:** Added ThemeProvider with dark/light palettes, migrated all 13 screens from hardcoded hex to theme-aware useColors() hook. TypeScript clean, 0 new lint warnings.
- **Next:** Add a dark/light toggle to the Settings screen so users can switch in-app without a DB change.

---

<!-- AGENT: prepend new journal entries above this line, using this template:

## YYYY-MM-DD HH:MM local time
- **Task:** <checklist item label>
- **Branch:** `auto/agent-YYYYMMDD-HHMM-<slug>`
- **PR:** #<number> — <url>
- **Summary:** <one sentence>
- **Next:** <what a future run should pick up, if anything>

-->
