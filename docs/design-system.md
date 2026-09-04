# Morning Que design system

One app, one look: Apple's dark-mode conventions, a white accent, thin line
icons, and Que's artwork as the only decoration. The structure is the Clock
app's; the sound is what makes it ours.

## Files

| File | Owns |
| --- | --- |
| `lib/tokens.ts` | `C` colours (Apple's dark system palette + white accent), `TYPE` text styles (iOS Dynamic Type sizes on the system font), `T`, `SP`, `R` |
| `lib/nav.ts` | the one header config: `STACK`, `ROOT` (large title), `SHEET`, `BARE`; the tab bar constants `TAB_BAR_HEIGHT`, `TAB_BAR_GAP`, `TAB_BAR_INSET` |
| `components/ui.tsx` | `Screen`, `Txt`, `Icon`, `Section`, `Row`, `Toggle`, `Button`, `IconButton`, `Field`, `SearchField`, `Divider`, `Empty` |
| `app/_layout.tsx` | root native stack |
| `app/(tabs)/_layout.tsx` | the five tabs and the floating glass tab bar; each tab is its own native stack |

There are no custom fonts, no shadows, no gradients (two exceptions below),
no hex code outside `lib/tokens.ts`, and no filled icons. Liquid glass is
allowed in exactly three places — the tab bar, the sound cards, and the
player — and nowhere else.

## Structure

```
Tabs ─ Alarms     bell          (large title; moon → Goodnight, plus → Add Alarm)
     ─ Sounds     music         (large title; search field; artwork rails; glass cards)
     ─ Habits     check-circle  (large title; plus → New Habit)
     ─ Gratitude  edit-3        (large title; the writing surface)
     ─ Progress   user          (large title; gear → Settings) — home base

Root stack ─ alarm-config  sheet    Cancel / Save in the bar, wheel, Sound row, Delete
           ─ habit-add     sheet
           ─ sounds        push     the same browser in pick mode
           ─ settings, edit-profile, edit-email, ambient-picker, alarm-debug   push
           ─ player, goodnight, paywall, welcome, intro, onboarding, auth      full-screen
```

Deleted: the drawer, `chat`, `edit-alarm` (superseded by `alarm-config`),
`glass-lab`, `background-picker`, the aurora backdrop, the material toggle,
the Switzer and Lora font files.

## Tokens

### Colour — `C`

Apple's dark palette, by its Apple name, with white as the one accent.

| Token | Apple name | Value | Use |
| --- | --- | --- | --- |
| `bg` | systemBackground | `#000000` | every screen's ground |
| `fill` | secondarySystemGroupedBackground | `#1C1C1E` | grouped list cells, fields, the player dock |
| `fillHigh` | tertiarySystemBackground | `#2C2C2E` | pressed cell, gray button, wheel band |
| `fillHighest` | systemFill | `#3A3A3C` | switch-off track, scrub track |
| `separator` | separator | `rgba(84,84,88,0.6)` | dividers |
| `label` | label | `#FFFFFF` | primary text |
| `labelSecondary` | secondaryLabel | 60% | values, meta |
| `labelTertiary` | tertiaryLabel | 30% | placeholders, off alarms, inactive tabs |
| `labelQuaternary` | quaternaryLabel | 18% | dimmed mantra lines |
| `accent` | — | `#FFFFFF` | tint: nav glyphs, prominent button, progress, selection ticks, the active tab |
| `onAccent` | — | `#000000` | label on a white fill |
| `danger` | systemRed | `#FF453A` | delete, sign out |
| `switchOn` | systemGreen | `#30D158` | the native Switch only |
| `scrim` | — | 45% black | flat veil under text on artwork |
| `overlayFill` | — | 72% `#1C1C1E` | disc / tile placed over artwork |
| `glassTint` | — | 22% white | tint of a `regular` glass bubble (the active-tab highlight) |
| `glassFallback` | — | 82% `#1C1C1E` | ground of a `clear` glass surface where liquid glass is unavailable |

**White is the accent.** Orange read as Apple's Clock app, not ours. The
prominent button is a white fill with a black label; ticks, the active tab
and every bar glyph are white; anything inactive steps down to
`labelTertiary` so it is clearly dimmer than the white beside it. Red stays
for destruction. Green stays on the switch because a switch that is not
green does not read as on.

### Type — `TYPE` (via `<Txt kind>`)

Apple's Large (default) Dynamic Type sizes, system font. `largeTitle` 34,
`title1` 28, `title2` 22, `title3` 20 semibold, `headline` 17 semibold,
`body` 17, `callout` 16, `subheadline` 15, `footnote` 13, `caption1` 12,
`caption2` 11.
Que adds `picker` 23 (wheel digits), `clock` 52 light (alarm rows),
`clockHero` 96 (reserved for a wake screen), `editorial` 34 semibold
(welcome and wind-down lines), `stat` 44 light (the positivity score).

### Icons — Feather

**Feather (`@expo/vector-icons`) is the app's icon set.** Thin, consistent
line icons, one pack, everywhere: the tab bar, rows, bar buttons, fields.
Use them through the `Icon` primitive:

```tsx
<Icon name="bell" />                                  // 22pt, white
<Icon name="chevron-right" size={20} color={C.labelTertiary} />
```

`Row`, `Button` and `IconButton` take the same Feather names in their
`icon` prop. Ionicons names that older screens still pass keep rendering —
common ones (`add`, `close`, `checkmark`, `chevron-back`, `person`,
`notifications`, …) are mapped to their Feather equivalent, the rest fall
back to the filled Ionicons glyph, which is the cue to migrate. Do not add
new Ionicons usage.

### Spacing — `SP`, radii — `R`

`SP.screen` = 16 (Apple's layout margin and cell inset), `SP.row` = 56
(minimum cell height), `SP.rowY` = 14 (cell vertical padding), `SP.hit` = 44,
`SP.field` = 52 (text field height), `SP.button` = 54.

`R.md` = 14 (inset grouped cell), `R.field` = 16 (fields), `R.lg` = 18
(buttons, sheets), `R.xl` = 20 (artwork tiles), `R.pill` for capsules.

Cells, fields, buttons and headers are deliberately bigger than UIKit's
defaults: thick, substantial, intentional. Real rounded corners, not 8pt
chamfers.

## Primitives

* **Section / Row** — an inset grouped list. Header in **title3 semibold,
  sentence case** (no more tiny uppercase footnote), rounded `fill` group
  at `R.md`, 56pt rows with icon · title/subtitle · value · chevron, or
  `right={<Toggle/>}`. This is the only list style in the app.
* **Toggle** — the native `Switch`, green on, `fillHighest` off.
* **Button** — `prominent` (white fill, black label; one per screen),
  `gray`, `plain` (white text), `destructive` (red text). 54pt, radius 18.
* **IconButton** — white Feather glyph, 44pt hit area; `disc` for a
  translucent disc over artwork.
* **Field / SearchField** — a 52pt text field on `fill`, radius 16, 17pt
  body text, `labelTertiary` placeholder, optional leading glyph and clear
  button. `SearchField` is a `Field` with the search glyph, search keyboard
  and clear button preset. Search bars on tab roots are `SearchField`, not
  a native `headerSearchBarOptions`.
* **Icon** — a Feather glyph with size/colour defaults (22pt, white).
* **Txt** — `kind` from `TYPE`, `tone` from the label colours. All text goes
  through it, so no screen sets a size, weight or colour by hand.
* **Empty** — the centred empty-state message.

Headers are never drawn by a screen. A screen sets its title and bar
buttons with `<Stack.Screen options={{ title, headerLeft, headerRight }} />`
and lets the native stack render them. Tab roots scroll with
`contentInsetAdjustmentBehavior="automatic"` so the large title collapses.

## The floating glass tab bar

The tab bar is not a docked `UITabBar`. It is a **floating liquid-glass
pill** (`expo-glass-effect`, `glassEffectStyle="clear"`), 64pt tall, inset
16pt from each side and 24pt above the home indicator, rendered by a custom
`tabBar` in `app/(tabs)/_layout.tsx`. Inside it a smaller **glass bubble**
(`regular` glass tinted `C.glassTint`) sits behind the active tab and
springs across to whichever tab is selected. Icons and labels are white
when active, `labelTertiary` when not; a selection haptic fires on change.
Where liquid glass is unavailable (Android, iOS before 26) the pill falls
back to `C.glassFallback` and the bubble to `C.glassTint`.

Because the pill floats **over** the scene rather than shrinking it, every
tab root must reserve room for it:

```tsx
import { TAB_BAR_INSET } from "@/lib/nav";

<ScrollView
  contentInsetAdjustmentBehavior="automatic"          // covers the home indicator
  contentContainerStyle={{ paddingBottom: TAB_BAR_INSET }}  // covers the pill
/>
```

`TAB_BAR_INSET` = pill (64) + gap (24) + one layout margin (16). Anything
that must never sit beneath the bar — a bottom `Button`, a player dock —
uses the same constant as its bottom margin.

## Glass: where it is allowed

Liquid glass is a material for chrome that floats over content, not a
container style. It is allowed in exactly three places:

1. **The tab bar** — the pill and its bubble (above).
2. **The sound cards** — the Sounds rails, where a glass label sits over
   full-bleed artwork.
3. **The player** — the transport and dock over the artwork / orb.

Nowhere else. Lists stay on `fill`; sheets stay on `fill`; buttons are a
flat white or gray fill. Glass on black is invisible, so a glass surface is
only ever placed where content scrolls or plays beneath it, and `clear`
glass always has a `glassFallback` ground for platforms without it. Glass
is never nested inside glass — a highlight over a glass surface is a
sibling view layered on top, as the tab bubble is.

## Principles, as applied

| Principle | Where you see it |
| --- | --- |
| Full-bleed imagery over cards | Sounds rails, alarm sheet artwork, welcome, paywall, player artwork mode |
| One dominant action per screen | one white `prominent` button or one bar action; Play is the biggest glyph on the player |
| Restrained chrome | black bars, no lines under them, glyph-only bar items, a floating pill instead of a docked bar |
| Large editorial typography | `clock` rows, `editorial` welcome and wind-down lines, `largeTitle` on every tab, `title3` section headers |
| Native iOS controls | `Switch`, native stack, sheet presentation, Cancel/Save in the bar |
| No rounded-rectangle soup | one container style (the inset group); artwork tiles and fields are the only other shapes |
| Gradients only when atmospheric | two exceptions: the teleprompter edge fades in the player, the fill under the Progress chart line |
| No generic SaaS UI | no cards with borders, no badges, no pill soup |
| No excessive borders | separators only; no outlined containers |
| Motion is part of the interface | the tab bubble's spring, orb pendulum, wind-down cross-fades, swipe-to-delete, press opacity |
| Content feels collectible | every sound is a poster; the selected one wears a white tick |
| Clear focal point | the time on Alarms, the wheel on the sheet, the artwork on Sounds, the orb on the player |

## Adding a screen

1. Start from `<Screen>` and `<Stack.Screen options>`.
2. Lists are `Section` + `Row`. Text is `Txt`. Icons are `Icon` (Feather).
   Actions are `Button` or `IconButton`. Text entry is `Field` / `SearchField`.
3. On a tab root, pad the scroll content by `TAB_BAR_INSET`.
4. If you need a shape that is not in `components/ui.tsx`, add it there.
5. Before you commit, this must print nothing for your file:

```
grep -nE '#[0-9a-fA-F]{3,8}\b|rgba\(|fontSize|fontFamily|fontWeight|textShadow|shadowColor|elevation|LinearGradient|Ionicons' app/your-screen.tsx
```

## Not done yet

* A dedicated ringing screen. A fired alarm opens the player in alarm mode;
  `TYPE.clockHero` is reserved for a screen that shows the time, the alarm
  name, Stop and Snooze, and nothing else.
* The wheel is a custom FlatList styled like `UIPickerView`. Swapping it for
  `@react-native-community/datetimepicker` in spinner mode would make it
  truly native; that needs a dependency install and a dev build.
* Device pass on iOS 26 (real liquid glass) and Android (the fallbacks)
  after `npm install` and `npm run typecheck`.
