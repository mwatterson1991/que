# Morning Que

An alarm clock that wakes you with real sound and guided sessions. Expo SDK
56, Expo Router, Supabase. Michael works from his phone; there is no laptop
in the loop.

## Read first

- `SHIPPING.md` — the only way a change reaches Michael's phone. Follow it
  exactly. Ship means merge to `main`; never ask him to use a computer.
- `docs/design-system.md` — the visual system. Every screen uses
  `components/ui.tsx` and `lib/tokens.ts`; no hex codes, sizes or fonts in
  screen files.
- `docs/alarm-audit.md` — how the alarm actually fires (AlarmKit on iOS 26,
  notification burst elsewhere).

## Working rules

- One branch per round of work, from `main`, one pull request, merged from
  the phone. Do not stack on a merged branch.
- `npm run typecheck` and `npx expo export --platform ios` must pass before
  a push.
- No em or en dashes anywhere in user-facing copy.
- Keep the app small. Five tabs, one dominant action per screen.
