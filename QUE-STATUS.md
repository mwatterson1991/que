# MORNING QUE — Live Status

> Rewritten 2026-08-22 after the great PR consolidation. Michael marks items `[x]` after merging.
>
> Legend: `[ ]` not started · `[✴]` PR open, awaiting review · `[x]` done · `[🚫]` blocked (see QUE-BLOCKERS.md)

## Where things stand (2026-08-26)

Everything ships from `main`; branch `sdk-53` holds the toolchain upgrade until its build verifies.

### Done
- [x] App core: alarms, player, browser rails, welcome + intro, guest mode
- [x] Real voices: Brian (18 hypnotherapy sessions, streamed) + Lily (horoscope, positive words)
- [x] 5 naturescapes + 3 binaural frequencies, all with artwork
- [x] Gratitude log + habit tracker in nav (accounts), positivity graph + share
- [x] App Store Connect record: Morning Que · com.michaelwatterson.que · ID 6751096101
- [x] Privacy/support pages live; listing copy, icon, keywords drafted
- [x] Type scale tokens, single black, a11y labels

### In flight
- [~] SDK 53 build compiling on EAS (branch sdk-53)
- [ ] Merge sdk-53 → main once the build runs clean

### Michael-only before submission
- [🚫] Age rating questionnaire (ASC → App Information)
- [🚫] Content rights declaration (same page)
- [🚫] EU trader status (ASC → Business) — required for EU distribution
- [🚫] Paid Apps Agreement + banking/tax — ONLY if turning the paywall on
- [🚫] TestFlight pass on a real iPhone

### Then
- [ ] Production build (`eas build --profile production`) + `eas submit`
- [ ] Fresh screenshots from the real app for the listing

## Run journal

## 2026-08-26 (launch-prep sprint 2)
- Brian (ElevenLabs) narrates all 18 sessions in Supabase; Lily narrates horoscope + positive words; robot voices deleted. ~25k/90k chars left.
- ASC record renamed: Morning Que · Wake Up With Purpose · com.michaelwatterson.que · Apple ID 6751096101 · Health & Fitness/Productivity.
- SDK 51 → 53 on branch sdk-53 (react 19 / RN 0.79); dev build compiling.
- Paywall OFF for v1 (Paid Apps Agreement unsigned — Michael's banking/tax step). Trader status (EU DSA) also pending, Michael-only.
- Fixed guest cold-start race that bounced users to welcome; alarms self-heal orphaned sounds.
- Remaining for submission: Michael signs Paid Apps Agreement (only if pursuing payments), age-rating questionnaire, content rights; then production build + upload + screenshots refresh.



## 2026-08-22 (Claude Code session — the big catch-up)
- **Task:** Full inventory + consolidation after 3-month gap
- **Summary:** Committed May local work (PR #32). Triaged all 31 April PRs: closed every one with notes; salvaged alarm audio reliability, background audio, ambient subsystem, entitlements/capabilities, EAS config, App Store content, scripts + TTS pipeline into PR #33 (typecheck clean; fixed a latent transport-controls bug in alarm mode). Locked name as Morning Que. Generated 3/18 session audios (ElevenLabs quota exhausted). Set EAS env vars, started first cloud iOS build. Privacy/support pages rebranded and staged in ~/morningque-site awaiting hosting decision.
- **Next:** Michael: merge #32 → #33, enroll Apple Developer, upgrade ElevenLabs plan, decide privacy hosting. Agent: SDK 51→current upgrade, a11y pass, finish audio, production build.

*(Older journal: 90+ NO-OP entries from April–May trimmed — see git history of this file if you're nostalgic.)*
