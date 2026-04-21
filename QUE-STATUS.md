# QUE — Live Status

> The agent updates this file every run. Michael marks items `[x]` after merging a PR.
>
> Legend: `[ ]` not started · `[~]` in progress (auto-branch exists) · `[✴]` PR open, awaiting review · `[x]` merged / complete · `[🚫]` blocked (see QUE-BLOCKERS.md)

Last agent run: 2026-04-21 15:30

## Checklist state

### Phase 01 — Core App
- [x] App built and functional
- [x] Supabase backend configured
- [x] Dummy data populated
- [✴] ElevenLabs integration — generate motivational audio files via Claude → [PR #25](https://github.com/mwatterson1991/que/pull/25) (scripts) + [PR #26](https://github.com/mwatterson1991/que/pull/26) (pipeline)
- [🚫] Replace dummy data with real generated audio content *(blocked: needs API keys — see QUE-BLOCKERS.md #4)*
- [✴] Alarm trigger plays correct audio reliably → [PR #3](https://github.com/mwatterson1991/que/pull/3)
- [✴] Background audio works when app is closed (iOS background modes) → [PR #4](https://github.com/mwatterson1991/que/pull/4)
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
- [✴] Privacy policy URL — hosted online → [PR #24](https://github.com/mwatterson1991/que/pull/24) *(draft copy ready; hosting URL still needed — see QUE-BLOCKERS.md #3)*
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

### Additional work (not on original checklist)
- [✴] Ambient background audio — dual-track voice + ambient mixing → [PR #27](https://github.com/mwatterson1991/que/pull/27)
- [✴] Hypnotherapy scripts (13 programs) for TTS pipeline → [PR #25](https://github.com/mwatterson1991/que/pull/25)

## Open auto-branches (27 PRs awaiting review)

| PR | Branch | Item |
|----|--------|------|
| [#1](https://github.com/mwatterson1991/que/pull/1) | `auto/agent-20260418-1500-onboarding-flow` | Onboarding flow |
| [#2](https://github.com/mwatterson1991/que/pull/2) | `auto/agent-20260418-1530-notification-permissions` | Notification permissions |
| [#3](https://github.com/mwatterson1991/que/pull/3) | `auto/agent-20260418-1630-alarm-scheduling` | Alarm scheduling |
| [#4](https://github.com/mwatterson1991/que/pull/4) | `auto/agent-20260418-1730-background-audio` | Background audio |
| [#5](https://github.com/mwatterson1991/que/pull/5) | `auto/agent-20260418-1830-edge-cases` | Edge cases |
| [#6](https://github.com/mwatterson1991/que/pull/6) | `auto/agent-20260418-1930-empty-states` | Empty states |
| [#7](https://github.com/mwatterson1991/que/pull/7) | `auto/agent-20260418-2030-dark-mode` | Dark mode |
| [#8](https://github.com/mwatterson1991/que/pull/8) | `auto/agent-20260418-2130-accessibility` | Accessibility |
| [#9](https://github.com/mwatterson1991/que/pull/9) | `auto/agent-20260418-2230-appstore-description` | App Store description |
| [#10](https://github.com/mwatterson1991/que/pull/10) | `auto/agent-20260419-0800-appstore-subtitle` | App Store subtitle |
| [#11](https://github.com/mwatterson1991/que/pull/11) | `auto/agent-20260419-0900-appstore-keywords` | Keywords |
| [#12](https://github.com/mwatterson1991/que/pull/12) | `auto/agent-20260419-1000-promo-text` | Promotional text |
| [#13](https://github.com/mwatterson1991/que/pull/13) | `auto/agent-20260419-1100-ios-capabilities` | iOS capabilities |
| [#14](https://github.com/mwatterson1991/que/pull/14) | `auto/agent-20260419-1200-entitlements-audit` | Entitlements |
| [#15](https://github.com/mwatterson1991/que/pull/15) | `auto/agent-20260419-1300-support-page` | Support page |
| [#16](https://github.com/mwatterson1991/que/pull/16) | `auto/agent-20260419-1400-review-notes` | Review notes |
| [#17](https://github.com/mwatterson1991/que/pull/17) | `auto/agent-20260419-1500-lock-app-name` | Lock app name |
| [#18](https://github.com/mwatterson1991/que/pull/18) | `auto/agent-20260419-1600-category-eas-config` | Category + EAS config |
| [#19](https://github.com/mwatterson1991/que/pull/19) | `auto/agent-20260419-1700-app-icon` | App icon |
| [#20](https://github.com/mwatterson1991/que/pull/20) | `auto/agent-20260419-1217-appstore-screenshots` | Screenshots |
| [#21](https://github.com/mwatterson1991/que/pull/21) | `auto/agent-20260419-1800-preview-video` | Preview video |
| [#22](https://github.com/mwatterson1991/que/pull/22) | `auto/agent-20260419-1800-preview-video-status` | Status update (preview video) |
| [#23](https://github.com/mwatterson1991/que/pull/23) | `auto/agent-20260419-1930-status-sync` | Status sync (stale) |
| [#24](https://github.com/mwatterson1991/que/pull/24) | `auto/agent-20260420-1400-privacy-policy-draft` | Privacy policy draft |
| [#25](https://github.com/mwatterson1991/que/pull/25) | `auto/agent-20260420-1630-hypnotherapy-scripts` | Hypnotherapy scripts |
| [#26](https://github.com/mwatterson1991/que/pull/26) | `auto/agent-20260420-1900-elevenlabs-pipeline` | ElevenLabs pipeline |
| [#27](https://github.com/mwatterson1991/que/pull/27) | `auto/agent-20260421-0900-ambient-audio` | Ambient audio |

**Suggested merge order:** Start with foundation PRs (#1 onboarding → #2 notifications → #3 alarm → #4 background audio → #5 edge cases), then polish (#6-#8), then App Store content (#9-#12, #17-#21), then infrastructure (#13-#14, #25-#27). Some PRs may have merge conflicts if not merged in roughly this order since they all branch from the same main commit.

## Run journal

## 2026-04-21 15:30 local time
- **Task:** Full status sync — update QUE-STATUS.md to reflect all 27 open PRs
- **Branch:** `auto/agent-20260421-1530-status-sync-full`
- **PR:** #28 — https://github.com/mwatterson1991/que/pull/28
- **Summary:** Comprehensive status sync. Every non-blocked checklist item now has a PR open. The bottleneck is PR review — 27 PRs await Michael's review and merge. Suggested merge order included.
- **Next:** Michael should begin reviewing and merging PRs, starting with foundation (PRs #1-5). Once API keys are provided (blocker #4), the agent can run the audio generation pipeline.

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
