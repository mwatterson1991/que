# Morning Que design system

One app, one look: Apple's dark-mode conventions with Que's artwork as the
only decoration. The structure is the Clock app's; the sound is what makes
it ours.

## Files

| File | Owns |
| --- | --- |
| `lib/tokens.ts` | `C` colours (Apple's dark system palette), `TYPE` text styles (iOS Dynamic Type sizes on the system font), `T`, `SP`, `R` |
| `lib/nav.ts` | the one header config: `STACK`, `ROOT` (large title), `SHEET`, `BARE` |
| `components/ui.tsx` | `Screen`, `Txt`, `Section`, `Row`, `Toggle`, `Button`, `IconButton`, `Divider`, `Empty` |
| `app/_layout.tsx` | root native stack |
| `app/(tabs)/_layout.tsx` | the five tabs; each tab is its own native stack |

There are no custom fonts, no shadows, no gradients (two exceptions below),
no blur, no glass, and no hex code outside `lib/tokens.ts`.

## Structure

```
Tabs ─ Alarms   (large title; moon → Goodnight, + → Add Alarm)
     ─ Sounds   (large title; search bar; artwork rails)
     ─ Habits   (large title; + → New Habit)
     ─ Journal  (large title; the writing surface)
     ─ Progress (large title; gear → Settings)

Root stack ─ alarm-config  sheet    Cancel / Save in the bar, wheel, Sound row, Delete
           ─ habit-add     sheet
           ─ sounds        push     the same browser in pick mode
           ─ settings, edit-profile, edit-email, ambient-picker, alarm-debug   push
           ─ player, goodnight, paywall, welcome, intro, onboarding, auth      full-screen
```

Deleted: the drawer, `chat`, `edit-alarm` (superseded by `alarm-config`),
`glass-lab`, `background-picker`, the aurora backdrop, the material toggle,
the Switzer and Lora font files, `expo-glass-effect`.

## Tokens

### Colour — `C`

Apple's dark palette, by its Apple name.

| Token | Apple name | Value | Use |
| --- | --- | --- | --- |
| `bg` | systemBackground | `#000000` | every screen's ground |
| `fill` | secondarySystemGroupedBackground | `#1C1C1E` | grouped list cells, the player dock |
| `fillHigh` | tertiarySystemBackground | `#2C2C2E` | pressed cell, gray button, wheel band |
| `fillHighest` | systemFill | `#3A3A3C` | switch-off track, scrub track |
| `separator` | separator | `rgba(84,84,88,0.6)` | dividers |
| `label` | label | `#FFFFFF` | primary text |
| `labelSecondary` | secondaryLabel | 60% | values, meta |
| `labelTertiary` | tertiaryLabel | 30% | placeholders, off alarms, inactive tabs |
| `labelQuaternary` | quaternaryLabel | 18% | dimmed mantra lines |
| `accent` | systemOrange | `#FF9F0A` | tint: nav glyphs, prominent button, progress, selection ticks |
| `onAccent` | | `#000000` | label on an orange fill |
| `danger` | systemRed | `#FF453A` | delete, sign out |
| `switchOn` | systemGreen | `#30D158` | the native Switch only |
| `scrim` | | 45% black | flat veil under text on artwork |
| `overlayFill` | | 72% `#1C1C1E` | disc / tile placed over artwork |

Orange is the Clock app's colour and was already this app's alarm colour.
Green stays on the switch because a switch that is not green does not read
as on.

### Type — `TYPE` (via `<Txt kind>`)

Apple's Large (default) Dynamic Type sizes, system font. `largeTitle` 34,
`title1` 28, `title2` 22, `title3` 20, `headline` 17 semibold, `body` 17,
`callout` 16, `subheadline` 15, `footnote` 13, `caption1` 12, `caption2` 11.
Que adds `picker` 23 (wheel digits), `clock` 64 light (alarm rows),
`clockHero` 96 (reserved for a wake screen), `editorial` 34 semibold
(welcome and wind-down lines), `stat` 44 light (the positivity score).

### Spacing — `SP`, radii — `R`

`SP.screen` = 16 (Apple's layout margin and cell inset), `SP.row` = 44,
`SP.hit` = 44. `R.md` = 10 (inset grouped cell), `R.lg` = 14 (buttons,
sheets), `R.xl` = 20 (artwork tiles).

## Primitives

* **Section / Row** — an inset grouped list. Header in uppercase footnote,
  rounded `fill` group, rows with icon · title/subtitle · value · chevron,
  or `right={<Toggle/>}`. This is the only list style in the app.
* **Toggle** — the native `Switch`, green on, `fillHighest` off.
* **Button** — `prominent` (orange, black label; one per screen), `gray`,
  `plain` (orange text), `destructive` (red text). 50pt, radius 14.
* **IconButton** — orange glyph, 44pt hit area; `disc` for a translucent
  disc over artwork.
* **Txt** — `kind` from `TYPE`, `tone` from the label colours. All text goes
  through it, so no screen sets a size, weight or colour by hand.
* **Empty** — the centred empty-state message.

Headers are never drawn by a screen. A screen sets its title and bar
buttons with `<Stack.Screen options={{ title, headerLeft, headerRight }} />`
and lets the native stack render them. Tab roots scroll with
`contentInsetAdjustmentBehavior="automatic"` so the large title collapses.

## Principles, as applied

| Principle | Where you see it |
| --- | --- |
| Full-bleed imagery over cards | Sounds rails, alarm sheet artwork, welcome, paywall, player artwork mode |
| One dominant action per screen | one `prominent` button or one bar action; Play is the biggest glyph on the player |
| Restrained chrome | black bars, no lines under them, glyph-only bar items |
| Large editorial typography | `clock` rows, `editorial` welcome and wind-down lines, `largeTitle` on every tab |
| Native iOS controls | `Switch`, native stack + tabs, sheet presentation, Cancel/Save in the bar |
| No rounded-rectangle soup | one container style (the inset group); artwork tiles are the only other shape |
| Gradients only when atmospheric | two exceptions: the teleprompter edge fades in the player, the fill under the Progress chart line |
| No generic SaaS UI | no cards with borders, no badges, no pill soup |
| No excessive borders | separators only; no outlined containers |
| Motion is part of the interface | orb pendulum, wind-down cross-fades, swipe-to-delete, press opacity |
| Content feels collectible | every sound is a poster; the selected one wears a tick |
| Clear focal point | the time on Alarms, the wheel on the sheet, the artwork on Sounds, the orb on the player |

## Adding a screen

1. Start from `<Screen>` and `<Stack.Screen options>`.
2. Lists are `Section` + `Row`. Text is `Txt`. Actions are `Button` or `IconButton`.
3. If you need a shape that is not in `components/ui.tsx`, add it there.
4. Before you commit, this must print nothing for your file:

```
grep -nE '#[0-9a-fA-F]{3,8}\b|rgba\(|fontSize|fontFamily|fontWeight|textShadow|shadowColor|elevation|LinearGradient' app/your-screen.tsx
```

## Not done yet

* A dedicated ringing screen. A fired alarm opens the player in alarm mode;
  `TYPE.clockHero` is reserved for a screen that shows the time, the alarm
  name, Stop and Snooze, and nothing else.
* The wheel is a custom FlatList styled like `UIPickerView`. Swapping it for
  `@react-native-community/datetimepicker` in spinner mode would make it
  truly native; that needs a dependency install and a dev build.
* Device pass on iOS and Android after `npm install` and `npm run typecheck`.
