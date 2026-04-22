# QUE — Live Status

> The agent updates this file every run. Michael marks items `[x]` after merging a PR.
>
> Legend: `[ ]` not started · `[~]` in progress (auto-branch exists) · `[✴]` PR open, awaiting review · `[x]` merged / complete · `[🚫]` blocked (see QUE-BLOCKERS.md)

Last agent run: 2026-04-22 10:00

## Checklist state

### Phase 01 — Core App
- [x] App built and functional
- [x] Supabase backend configured
- [x] Dummy data populated
- [✴] ElevenLabs integration — generate motivational audio files via Claude → [PR #25](https://github.com/mwatterson1991/que/pull/25) (scripts) + [PR #26](https://github.com/mwatterson1991/que/pull/26) (pipeline)
- [🚫] Replace dummy data with real generated audio content *(blocked: needs API keys — see QUE-BLOCKERS.md #4)*
- [✴] Alarm trigger plays correct audio reliably → [PR #3](https://github.com/mwatterson1991/que/pull/3) (scheduling) + [PR #29](https://github.com/mwatterson1991/que/pull/29) (reliability)
- [✴] Background audio works when app is closed (iOS background modes) → [PR #4](https://github.com/mwatterson1991/que/pull/4) + [PR #27](https://github.com/mwatterson1991/que/pull/27) (ambient mixing)
- [✴] Edge cases handled — no alarm, late permissions, silent mode → [PR #5](https://github.com/mwatterson1991/que/pull/5)

### Phase 02 — App Polish
- [✴] Onboarding flow for new users → [PR #1](https://github.com/mwatterson1991/que/pull/1)
- [✴] Push notification permissions requested gracefully → [PR #2](https://github.com/mwatterson1991/que/pull/2)
- [✴] Empty states designed (no alarms set, etc.) → [PR #6](https://github.com/mwatterson1991/que/pull/6)
- [🚫] Crash-free on iPhone and iPad — tested on real devices *(human-only)*
- [✴] Dark mode support → [PR #7](https://github.com/mwatterson1991/que/pull/7)
- [✴] Accessibility pass — Dynamic Type, VoiceOver basics → [PR #8](https://github.com/mwatterson1991/que/pull/8)

### Phase 03 — App Store Content
- [✴] Final app name locked — Que → [PR #17](https://github.com/mwatterson1991/que/pull/17)
- [✴] App Store subtitle (30 chars max) → [PR #10](https://github.com/mwatterson1991/que/pull/10)
- [✴] Full App Store description (4000 chars) → [PR #9](https://github.com/mwatterson1991/que/pull/9)
- [✴] Keywords field (100 chars max, comma-separated) → [PR #11](https://github.com/mwatterson1991/que/pull/11)
- [✴] Promotional text (170 chars — updatable without resubmit) → [PR #12](https://github.com/mwatterson1991/que/pull/12)
- [✴] Screenshots — 6.9" iPhone, 6.5" iPhone, 12.9" iPad (if supported) → [PR #20](https://github.com/mwatterson1991/que/pull/20)
- [✴] App preview video (optional — 15–30 sec) → [PR #21](https://github.com/mwatterson1991/que/pull/21)
- [✴] App icon — 1024×1024px, no alpha channel → [PR #19](https://github.com/mwatterson1991/que/pull/19)
- [✴] Privacy policy URL — hosted online → [PR #24](https://github.com/mwatterson1991/que/pull/24) (draft copy ready; hosting URL needed — see QUE-BLOCKERS.md #3)
- [✴] Support URL — even a simple landing page works → [PR #15](https://github.com/mwatterson1991/que/pull/15)
- [✴] Category selected — Health & Fitness or Productivity → [PR #18](https://github.com/mwatterson1991/que/pull/18)
- [🚫] Age rating questionnaire completed *(human-only)*

### Phase 04 — Apple Developer
- [🚫] Apple Developer Program enrolled ($99/yr) *(human-only)*
- [🚫] Bundle ID registered in App Store Connect *(human-only)*
- [🚫] App record created in App Store Connect *(human-only)*
- [ ] Distribution certificate and provisioning profile set up in Xcode
- [✴] Required capabilities enabled — background audio, notifications → [PR #13](https://github.com/mwatterson1991/que/pull/13)
- [✴] Entitlements file correct for all capabilities used → [PR #14](https://github.com/mwatterson1991/que/pull/14)

### Phase 05 — Submission
- [ ] Archive built in Xcode (Product → Archive)
- [ ] Archive validated — no errors in Organizer
- [ ] Build uploaded to App Store Connect via Xcode Organizer
- [🚫] Build selected in App Store Connect listing *(human-only)*
- [✴] Review notes written for App Review team → [PR #16](https://github.com/mwatterson1991/que/pull/16)
- [🚫] Submitted for App Review *(human-only)*
- [ ] App approved
- [ ] App live on the App Store

## Open auto-branches

| PR | Branch | Checklist item |
|----|--------|----------------|
| [#1](https://github.com/mwatterson1991/que/pull/1) | `auto/agent-20260418-1500-onboarding-flow` | Onboarding flow for new users |
| [#2](https://github.com/mwatterson1991/que/pull/2) | `auto/agent-20260418-1530-notification-permissions` | Push notification permissions |
| [#3](https://github.com/mwatterson1991/que/pull/3) | `auto/agent-20260418-1630-alarm-scheduling` | Alarm scheduling via local notifications |
| [#4](https://github.com/mwatterson1991/que/pull/4) | `auto/agent-20260418-1730-background-audio` | Background audio lifecycle |
| [#5](https://github.com/mwatterson1991/que/pull/5) | `auto/agent-20260418-1830-edge-cases` | Edge cases — no alarm, permissions, silent mode |
| [#6](https://github.com/mwatterson1991/que/pull/6) | `auto/agent-20260418-1930-empty-states` | Empty states for all screens |
| [#7](https://github.com/mwatterson1991/que/pull/7) | `auto/agent-20260418-2030-dark-mode` | Dark mode support |
| [#8](https://github.com/mwatterson1991/que/pull/8) | `auto/agent-20260418-2130-accessibility` | Accessibility — VoiceOver + Dynamic Type |
| [#9](https://github.com/mwatterson1991/que/pull/9) | `auto/agent-20260418-2230-appstore-description` | Full App Store description |
| [#10](https://github.com/mwatterson1991/que/pull/10) | `auto/agent-20260419-0800-appstore-subtitle` | App Store subtitle |
| [#11](https://github.com/mwatterson1991/que/pull/11) | `auto/agent-20260419-0900-appstore-keywords` | App Store keywords |
| [#12](https://github.com/mwatterson1991/que/pull/12) | `auto/agent-20260419-1000-promo-text` | Promotional text |
| [#13](https://github.com/mwatterson1991/que/pull/13) | `auto/agent-20260419-1100-ios-capabilities` | iOS/Android capabilities |
| [#14](https://github.com/mwatterson1991/que/pull/14) | `auto/agent-20260419-1200-entitlements-audit` | iOS entitlements |
| [#15](https://github.com/mwatterson1991/que/pull/15) | `auto/agent-20260419-1300-support-page` | Support page + landing page |
| [#16](https://github.com/mwatterson1991/que/pull/16) | `auto/agent-20260419-1400-review-notes` | App Review notes |
| [#17](https://github.com/mwatterson1991/que/pull/17) | `auto/agent-20260419-1500-lock-app-name` | Lock app name as Que |
| [#18](https://github.com/mwatterson1991/que/pull/18) | `auto/agent-20260419-1600-category-eas-config` | App Store category + EAS config |
| [#19](https://github.com/mwatterson1991/que/pull/19) | `auto/agent-20260419-1700-app-icon` | App icon |
| [#20](https://github.com/mwatterson1991/que/pull/20) | `auto/agent-20260419-1217-appstore-screenshots` | App Store screenshots |
| [#21](https://github.com/mwatterson1991/que/pull/21) | `auto/agent-20260419-1800-preview-video` | App preview video |
| [#24](https://github.com/mwatterson1991/que/pull/24) | `auto/agent-20260420-1400-privacy-policy-draft` | Privacy policy draft |
| [#25](https://github.com/mwatterson1991/que/pull/25) | `auto/agent-20260420-1630-hypnotherapy-scripts` | 13 hypnotherapy scripts |
| [#26](https://github.com/mwatterson1991/que/pull/26) | `auto/agent-20260420-1900-elevenlabs-pipeline` | ElevenLabs TTS pipeline |
| [#27](https://github.com/mwatterson1991/que/pull/27) | `auto/agent-20260421-0900-ambient-audio` | Ambient background audio mixing |
| [#29](https://github.com/mwatterson1991/que/pull/29) | `auto/agent-20260421-1600-alarm-audio-reliability` | Alarm audio reliability |

*PRs #22, #23, #28 are docs/status-sync PRs — superseded by this update.*

## What's left before launch

**Waiting on Michael (blockers):**
1. Merge the 26 open feature/copy PRs above (review in numbered order for cleanest merge path)
2. Add ElevenLabs + Claude API keys to `.env` (unblocks real audio generation)
3. Choose privacy policy hosting URL (GitHub Pages, personal site, or Notion)
4. Enroll in Apple Developer Program ($99/yr)
5. Enroll in Google Play Console ($25 one-time)
6. Physical device testing after merges

**Waiting on merges + API keys (agent will auto-pick up):**
- Replace dummy data with real generated audio content

**Waiting on Apple Developer enrollment (agent will auto-pick up):**
- Distribution certificate setup
- Archive build + validation

## Run journal

## 2026-04-22 10:00 local time
- **Task:** Comprehensive status sync — map all 29 open PRs to checklist items
- **Branch:** `auto/agent-20260422-1000-status-sync`
- **PR:** #30 — https://github.com/mwatterson1991/que/pull/30
- **Summary:** Updated QUE-STATUS.md to accurately reflect all 29 open PRs across 26 checklist items; added "what's left" summary for Michael; supersedes prior status sync PRs #22/#23/#28.
- **Next:** All non-blocked checklist items have open PRs. Michael needs to start reviewing and merging (recommend in PR number order). Once API keys are in `.env`, agent will generate real audio content.

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
