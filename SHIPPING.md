# Shipping Morning Que

The whole workflow, phone only. No laptop. Every Claude session must follow
this exactly; do not invent another route.

## The loop

1. Claude opens a pull request against `main`.
2. Michael merges it from his phone (GitHub app or GitHub in Safari).
3. Merging `main` triggers `.eas/workflows/ship.yml` on Expo's servers:
   build iOS with the `production` profile, then submit to TestFlight.
4. About 25 minutes later TestFlight offers the update. Install it.

Nothing else. No `expo start`, no dev client, no "run this on your Mac".

## Rules for Claude sessions

- Ship = merge to `main`. Never ask for the Mac.
- After a merge, watch expo.dev → Morning Que → Workflows for the run. If it
  fails, read the log, fix the cause in a new PR, and say exactly what failed.
- If the workflow does not start at all, the repo is not linked to EAS (see
  "One-time setup"). Fall back to running it from the session: the Que
  cloud environment has `EXPO_TOKEN`; run
  `npx eas-cli build --platform ios --profile production --non-interactive --auto-submit`.
  If that fails for want of a token, say so in one sentence and stop; do
  not send Michael to a computer.
- Native changes (a new native module, app.json plugins, icons, sounds) go
  through this same loop; they just cannot ride an over-the-air update.
- Pure JavaScript changes may additionally be pushed over the air with
  `npx eas-cli update --branch production --message "<what>"` so they land
  without a new install, but the TestFlight build still happens.

## One-time setup (phone browser, about five minutes)

Do these once and the loop above works forever.

1. **Link GitHub to EAS.** expo.dev → Morning Que project → Settings →
   GitHub → Connect repository → `mwatterson1991/que`. This installs the
   Expo GitHub app; approve it. This is what lets `.eas/workflows/ship.yml`
   run on merge.
2. **App Store Connect API key on EAS** (only if the Submit step fails the
   first time with a credentials error). expo.dev → project → Credentials →
   iOS → App Store Connect API Key → add. The key itself comes from
   appstoreconnect.apple.com → Users and Access → Integrations → App Store
   Connect API → generate (role: App Manager), download the `.p8`, upload it
   there with its Key ID and Issuer ID.
3. **Token for Claude sessions (fallback path).** expo.dev → Account settings
   → Access tokens → Create. Then claude.ai/code → Environments → Que → add
   environment variable `EXPO_TOKEN` with that value. Only needed if step 1
   is not done, or for over-the-air updates.

## What already exists

- `eas.json`: `production` profile with `autoIncrement: true` and
  `appVersionSource: remote` (build numbers count up on their own);
  `submit.production.ios` carries the App Store Connect app id and team id.
- The EAS project id is in `app.json` under `extra.eas.projectId`.
- iOS distribution certificate and provisioning profile were created by
  earlier EAS builds and live on EAS.

## If it breaks

| Symptom | Cause | Fix |
| --- | --- | --- |
| Nothing appears under Workflows after a merge | Repo not linked to EAS | One-time setup step 1 |
| Build succeeds, Submit fails on credentials | No App Store Connect API key on EAS | One-time setup step 2 |
| Build fails on `Runtime version` / fingerprint | Expected after native changes; TestFlight still installs | Nothing |
| TestFlight shows no new build after 40 minutes | Apple processing, or Submit failed | Check the workflow log on expo.dev |
