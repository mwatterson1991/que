# MORNING QUE — Blockers

> Items that require Michael's action. Updated 2026-08-22. All are phone-doable except device testing.

## Active blockers

### 0. Supabase project is asleep — quickest fix, do first
- **Status:** The app's database (wesobiewlaakwvrfldpn.supabase.co) no longer responds — free-tier projects pause after weeks of inactivity, and it's been idle since May. Login and all data fail until it's restored.
- **Do:** Open https://supabase.com/dashboard on your phone → open the project → tap Restore. Takes ~2 minutes to wake.

### 1. Apple Developer Program enrollment — THE critical path
- **Blocks:** Everything in Phase 04/05 — bundle ID, App Store Connect, production builds, TestFlight, submission.
- **Do:** https://developer.apple.com/programs/ — enroll as individual (~$99/yr). Approval takes 24–48h, so start now.
- **Then:** Put your Apple Team ID and (once the app record exists) ASC App ID into `eas.json` → `submit.production.ios`.

### 2. ElevenLabs plan upgrade (was: API keys)
- **Status:** Key is in `.env` and works — but the plan's 10,000 credits/mo ran out after 3 of 18 sessions. ~50k more credits needed (each script ≈ 3.3k).
- **Do:** Upgrade at https://elevenlabs.io (Creator tier or above; paid plan also required for commercial use).
- **Then:** The agent reruns `node scripts/generate-audio.mjs --local-only` — already-generated files are cached and cost nothing.

### 4. SUPABASE_SERVICE_ROLE_KEY in .env
- **Blocks:** Uploading generated audio to Supabase storage + upserting session records.
- **Do:** Supabase dashboard → Project Settings → API → copy `service_role` key → add `SUPABASE_SERVICE_ROLE_KEY=...` to `.env` (never commit).
- **Also:** Run `supabase/migrations/2026-08-22-add-ambient-sound.sql` in the SQL editor after merging PR #33.

### 5. Physical device testing
- **Blocks:** Final QA — alarms/background audio only prove themselves on a real iPhone.
- **Do:** After Apple enrollment: TestFlight build → set an alarm → lock phone → confirm it wakes you.

## Resolved

- **2026-08-22 — Privacy policy + support hosting:** live at https://mwatterson1991.github.io/morningque-site/privacy.html and …/support.html (public repo mwatterson1991/morningque-site, approved by Michael). URLs wired into appstore/metadata.json.
- **2026-08-22 — Google Play enrollment:** deferred, iOS-first launch.
- **2026-08-22 — API keys partially:** ElevenLabs + Supabase public keys present and working (see #2/#4 for what remains).
