# QUE — Blockers

> Items that require Michael's physical action. The agent will not touch anything in this list. When Michael resolves a blocker, he removes it from this file.

## Active blockers

### 1. Apple Developer Program enrollment
- **Blocks:** Bundle ID registration, App Store Connect setup, Distribution certificate, Archive validation, Submission.
- **What you need to do:** Go to https://developer.apple.com/programs/ and enroll as an individual (~$99/year). Have your Apple ID, photo ID, and a credit card ready. Enrollment review can take 24–48 hours.
- **Once done:** Remove this entry. Agent will then start working Phase 04 items.

### 2. Google Play Console enrollment (for Android launch)
- **Blocks:** Any Android-store submission work.
- **What you need to do:** Go to https://play.google.com/console/signup and enroll (~$25 one-time). Create developer profile, verify identity.
- **Once done:** Remove this entry.

### 3. Privacy policy hosting
- **Blocks:** `Privacy policy URL — hosted online` checklist item. The agent will draft the copy, but needs a URL to reference.
- **What you need to do:** Decide where the policy will live. Cheap options: GitHub Pages on this repo (free), a subpage on your personal site, or a Notion public page. Once you pick, share the URL here and the agent will wire it into the app + App Store listing.

### 4. ElevenLabs + Claude API keys in .env
- **Blocks:** ElevenLabs integration, real audio generation.
- **What you need to do:** Add the following to `.env` (do NOT commit):
  - `ELEVENLABS_API_KEY=...` — get from https://elevenlabs.io (requires paid plan for commercial use)
  - `ANTHROPIC_API_KEY=...` — get from https://console.anthropic.com
- **Once done:** Remove this entry. The agent will see the vars in `.env.example` and proceed.

### 5. Physical device testing
- **Blocks:** `Crash-free on iPhone and iPad — tested on real devices` and final QA before submission.
- **What you need to do:** When the agent flags a build as ready for device testing, install via Expo Go / TestFlight and run through the flows.

## Resolved blockers

*(Move entries here once resolved, with the date.)*
