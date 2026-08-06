# Pulse — Design System

> Single source of truth for visual design. Reference this document when building any component. All tokens map directly to React Native `StyleSheet` values (unitless density-independent pixels, hex color strings, string font weights).

---

## 0. Design Philosophy

Pulse is a calm, premium tool for solo youth soccer coaches. The interface should feel like a well-organized clipboard, not a dashboard.

Three principles govern every decision, drawn from our references:

1. **Content leads, UI disappears** *(Monarch)*. White surfaces, hairline borders over heavy shadows, generous whitespace. Color is an accent, never a wallpaper. A screen at rest should look almost empty.
2. **The pitch is the canvas** *(SoccerDrive)*. On the drawing canvas the chrome goes dark and recedes; the field and the coach's marks are the only things that matter.
3. **Typography carries hierarchy.** We separate information with size, weight, and space — not boxes, rules, or background fills.

When in doubt: remove the border, add the whitespace, drop the color.

### Typeface: Poppins

Pulse uses **Poppins** across iOS and Android — a geometric sans that reads modern, approachable, and sporty. Poppins is not installed on either platform, so it must be **bundled and loaded** before the UI renders. Two rules are non-negotiable:

1. **Select weight by font family, never `fontWeight`.** With custom fonts, `fontWeight: '600'` is unreliable on Android (it renders Regular or a faux-bold). Always set `fontFamily` to the specific weight's family (e.g. `fonts.semibold`) and **omit `fontWeight` entirely**. The four families are mapped in the `fonts` token (Appendix).
2. **Load fonts before first paint.** Hold the splash screen until Poppins is ready, or text will flash in a fallback font.

Recommended setup (Expo bare workflow):

```ts
// App entry
import { useFonts,
  Poppins_400Regular, Poppins_500Medium,
  Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const [loaded] = useFonts({
  Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
});
if (!loaded) return null; // splash stays up
SplashScreen.hideAsync();
```

The `@expo-google-fonts/poppins` package supplies the font files and the exact family names (`Poppins_400Regular`, …) used by the `fonts` token. If you instead bundle `.ttf` files manually via `npx react-native-asset`, the family names become `Poppins-Regular`, `Poppins-Medium`, etc. — change them in **one place** (`fonts`) and everything follows.

> **Migration rule:** anywhere a spec quotes a weight (e.g. the tab bar's "Medium" label), that means "use the matching `fonts.*` family," not `fontWeight`.

---

## 1. Color Tokens

All colors are hex strings or `rgba()` strings, ready for `StyleSheet`.

### Brand / Primary

| Token | Value | Use |
|---|---|---|
| `colors.primary` | `#1A7A44` | Brand green. Primary buttons, active states, selected chips, key accents. Use sparingly. |
| `colors.primaryPressed` | `#155E36` | Pressed/active state for primary surfaces. |
| `colors.primaryTint` | `#E8F3EC` | Light green fill behind selected chips, active tab background, subtle highlights. |
| `colors.primaryTintStrong` | `#CDE6D6` | Slightly stronger tint for hover/secondary emphasis. |
| `colors.onPrimary` | `#FFFFFF` | Text/icons on top of `primary`. |

### Surfaces

| Token | Value | Use |
|---|---|---|
| `colors.background` | `#FFFFFF` | App background. Default everywhere. |
| `colors.surface` | `#FFFFFF` | Cards, sheets, raised elements. |
| `colors.surfaceSunken` | `#F6F7F6` | Input fills, grouped section backgrounds, the rare "recessed" area. |
| `colors.surfaceHover` | `#F0F2F0` | Pressed state for list rows and ghost surfaces. |

### Text

| Token | Value | Use |
|---|---|---|
| `colors.textPrimary` | `#16181A` | Headlines, primary body, default icon color. |
| `colors.textSecondary` | `#5C6166` | Supporting copy, metadata, captions. |
| `colors.textTertiary` | `#9AA0A6` | Placeholder text, disabled hints, timestamps. |
| `colors.textDisabled` | `#C2C7CC` | Disabled labels. |
| `colors.textInverse` | `#FFFFFF` | Text on dark/colored surfaces (canvas top bar, primary buttons). |

### Borders

| Token | Value | Use |
|---|---|---|
| `colors.borderSubtle` | `#F0F1F2` | Hairline dividers, list separators. Default separator. |
| `colors.border` | `#E3E5E8` | Card borders, input borders at rest. |
| `colors.borderStrong` | `#CBD0D4` | Input focus contrast, emphasized dividers. |

### Semantic

These overlap visually with some block-type colors but carry **status** meaning. Keep them distinct in code.

| Token | Value | Use |
|---|---|---|
| `colors.success` | `#16A34A` | Confirmation, completion, positive deltas. |
| `colors.successTint` | `#E7F6EC` | Success banner/background. |
| `colors.warning` | `#F59E0B` | Caution, unsaved changes, attention. |
| `colors.warningTint` | `#FEF3E2` | Warning background. |
| `colors.error` | `#DC2626` | Destructive actions, validation errors. |
| `colors.errorTint` | `#FCEAEA` | Error background. |
| `colors.info` | `#3B82F6` | Informational, neutral highlight. |
| `colors.infoTint` | `#EAF1FE` | Info background. |

### Canvas overlay

| Token | Value | Use |
|---|---|---|
| `colors.overlayBar` | `rgba(20, 22, 24, 0.72)` | Dark top bar over the canvas. |
| `colors.overlayScrim` | `rgba(0, 0, 0, 0.40)` | Bottom-sheet / modal backdrop. |
| `colors.canvasInk` | `#16181A` | Default color for player marks, lines, and arrows on the pitch. |

### Block-type palette

Each block type gets a **base** color (the 4px bar, dots, line previews) and a **tint** (chip/label backgrounds). Tints are ~12% opacity equivalents, pre-flattened for predictable rendering on white.

| Block type | Token (base) | Base | Token (tint) | Tint |
|---|---|---|---|---|
| Warm-up | `colors.block.warmup` | `#F59E0B` | `colors.block.warmupTint` | `#FEF3E2` |
| Technical | `colors.block.technical` | `#6366F1` | `colors.block.technicalTint` | `#ECEDFD` |
| Possession | `colors.block.possession` | `#16A34A` | `colors.block.possessionTint` | `#E7F6EC` |
| Pressing | `colors.block.pressing` | `#DC2626` | `colors.block.pressingTint` | `#FCEAEA` |
| Attacking | `colors.block.attacking` | `#3B82F6` | `colors.block.attackingTint` | `#EAF1FE` |
| Defending | `colors.block.defending` | `#EF4444` | `colors.block.defendingTint` | `#FDECEC` |
| Transition | `colors.block.transition` | `#0891B2` | `colors.block.transitionTint` | `#E3F4F8` |
| Game | `colors.block.game` | `#7C3AED` | `colors.block.gameTint` | `#F0E9FD` |

These eight values are the canonical `BlockType` set and match the `BlockType` enum in `architecture.md`. They color-code **session blocks** (the card's left bar). Library filter chips key off `ActivityTag`, a wider set (adds `finishing`, `set-piece`) — those chips use the standard filter-chip treatment (§6), **not** per-tag colors, so no extra tokens are needed for them.

> **Two close-color clusters — never rely on color alone:** Pressing/Defending are deliberately close reds (`#DC2626` / `#EF4444`), and Technical/Attacking/Game form a cool blue-violet cluster (`#6366F1` / `#3B82F6` / `#7C3AED`). Always pair the bar with the block-type label text so the two are distinguishable.

---

## 2. Typography Scale

Poppins, four families only: `fonts.regular` (400), `fonts.medium` (500), `fonts.semibold` (600), `fonts.bold` (700). Weight is chosen by **family** — do not set `fontWeight`.

Each row is a **preset** — spread it directly: `style={[typography.h1, { color: colors.textPrimary }]}`. `lineHeight` is an absolute number (RN convention), `letterSpacing` is in px. Line-heights run a touch taller than a system-font scale would, to keep Poppins's geometric letterforms comfortable for reading.

| Preset | fontSize | lineHeight | family | letterSpacing | Use |
|---|---|---|---|---|---|
| `typography.display` | 32 | 40 | `fonts.bold` | -0.5 | Empty-state headlines, big moments. |
| `typography.h1` | 24 | 32 | `fonts.bold` | -0.4 | Screen titles (large nav title). |
| `typography.h2` | 20 | 28 | `fonts.semibold` | -0.3 | Section headers. |
| `typography.h3` | 17 | 24 | `fonts.semibold` | -0.2 | Card titles, list-row titles. |
| `typography.body` | 16 | 26 | `fonts.regular` | 0 | Default reading text. |
| `typography.bodyStrong` | 16 | 26 | `fonts.semibold` | 0 | Emphasized body, inline labels. |
| `typography.callout` | 15 | 22 | `fonts.regular` | 0 | Secondary body, sheet descriptions. |
| `typography.label` | 14 | 20 | `fonts.medium` | 0 | Chips, tab labels, buttons (sm/md), metadata keys. |
| `typography.caption` | 13 | 18 | `fonts.regular` | 0 | Timestamps, helper text, metadata values. |
| `typography.overline` | 11 | 14 | `fonts.semibold` | 0.8 | UPPERCASE block-type tags, eyebrow labels. Apply `textTransform: 'uppercase'`. |

Rules:
- One `h1` per screen, left-aligned (Monarch large-title pattern).
- Never use more than two families in a single component.
- Body line height is generous (~1.6×) on purpose — leave it; Poppins needs the air.
- Poppins runs visually large for its point size. If a screen feels oversized, nudge sizes down by 1 rather than changing the scale wholesale.

---

## 3. Spacing Scale

4px base grid. Whitespace is the primary structural tool, so reach for the larger steps freely.

| Token | Value | Typical use |
|---|---|---|
| `spacing.xxs` | 2 | Icon-to-label nudge, hairline insets. |
| `spacing.xs` | 4 | Tight internal padding. |
| `spacing.sm` | 8 | Gap between related inline items. |
| `spacing.md` | 12 | Default gap inside components. |
| `spacing.lg` | 16 | Card padding, gap between rows. |
| `spacing.xl` | 24 | Section padding, gap between cards. |
| `spacing.xxl` | 32 | Gap between distinct content sections. |
| `spacing.xxxl` | 48 | Major vertical breaks, empty-state spacing. |
| `spacing.xxxxl` | 64 | Hero whitespace above empty states. |

Layout constants:

| Token | Value | Use |
|---|---|---|
| `layout.screenPaddingX` | 20 | Default horizontal screen padding. |
| `layout.sectionGap` | 32 | Vertical gap between screen sections. |
| `layout.hitSlop` | 8 | Minimum hitSlop to bring small icons to a 44px touch target. |
| `layout.touchTarget` | 44 | Minimum interactive target size. |

---

## 4. Border Radius

| Token | Value | Use |
|---|---|---|
| `radius.none` | 0 | Full-bleed elements, the canvas. |
| `radius.sm` | 8 | Small chips, inline tags, thumbnails. |
| `radius.md` | 12 | Inputs, secondary buttons, small cards. |
| `radius.lg` | 16 | Cards (default), large containers. |
| `radius.xl` | 20 | Modals, prominent containers. |
| `radius.xxl` | 28 | Bottom-sheet top corners. |
| `radius.pill` | 999 | Filter chips, primary CTA pills, player markers, the Create button. |

---

## 5. Elevation / Shadow

Prefer **hairline borders** over shadows (Monarch). Use shadow only to lift floating elements (sheets, the Create button, the canvas tool palette, selection toolbar). Shadow tokens include iOS keys and Android `elevation`.

| Token | iOS values | Android |
|---|---|---|
| `shadow.none` | opacity 0 | elevation 0 |
| `shadow.sm` | offset `{0,1}`, radius 2, opacity 0.06, color `#000` | elevation 1 |
| `shadow.md` | offset `{0,4}`, radius 12, opacity 0.08, color `#000` | elevation 4 |
| `shadow.lg` | offset `{0,8}`, radius 24, opacity 0.12, color `#000` | elevation 12 |

```ts
// shadow.md, for example
{
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
}
```

---

## 6. Component Specs

### Button

| Property | Value |
|---|---|
| Heights | `sm` 36, `md` 48 (default), `lg` 56 |
| Horizontal padding | `sm` 14, `md` 20, `lg` 24 |
| Radius | `radius.pill` for primary CTAs; `radius.md` for inline/secondary |
| Label preset | `typography.label` (sm/md), `typography.bodyStrong` (lg) |
| Icon size | 18 (sm), 20 (md/lg); gap `spacing.sm` |
| Min width | full-width on primary actions; `layout.touchTarget` minimum otherwise |

Variants:

- **Primary** — fill `colors.primary`, label `colors.onPrimary`. Pressed: `colors.primaryPressed`.
- **Secondary (tonal)** — fill `colors.primaryTint`, label `colors.primary`. Pressed: `colors.primaryTintStrong`.
- **Outline** — fill transparent, border 1px `colors.border`, label `colors.textPrimary`. Pressed: fill `colors.surfaceHover`.
- **Ghost** — fill transparent, no border, label `colors.textPrimary` (or `colors.primary` for emphasis). Pressed: `colors.surfaceHover`.
- **Destructive** — fill `colors.error`, label `colors.textInverse`. Pressed: darken ~8%.

States: pressed uses the variant color above **plus** `opacity: 0.96` and `scale: 0.98` (see Motion). Disabled: fill `colors.surfaceSunken`, label `colors.textDisabled`, no press feedback.

### Card

The default container. Quiet by design.

| Property | Value |
|---|---|
| Background | `colors.surface` |
| Border | 1px `colors.border` (preferred) — **no shadow at rest** |
| Radius | `radius.lg` (16) |
| Padding | `spacing.lg` (16); roomy cards `spacing.xl` (24) |
| Gap between stacked cards | `spacing.md`–`spacing.lg` |
| Pressed (if tappable) | background `colors.surfaceHover`, scale `0.99` |

**Session builder hybrid card** (special):

```
┌─┬───────────────────────────────────────────┐
│ │  [canvas thumbnail]   Activity title        │   ← header row, always visible
│B│                       block-type overline   │
│A│  ───────────────────────────────────────── │
│R│  ▸ Coaching points (expandable, inline)     │   ← expands in place
└─┴───────────────────────────────────────────┘
```

- **Left color bar**: width 4, full card height, `colors.block.<type>`, radius matches card's left corners (`borderTopLeftRadius`/`borderBottomLeftRadius` = `radius.lg`). Implement as an absolutely-positioned view or a flex column so it bleeds to the card edges; card content gets `paddingLeft: spacing.lg + 4`.
- **Canvas thumbnail**: square, 56×56, `radius.sm`, 1px `colors.borderSubtle`, `colors.surfaceSunken` placeholder when empty.
- **Title**: `typography.h3`, `colors.textPrimary`. **Block-type overline**: `typography.overline`, uppercase, color = block base.
- **Coaching points**: collapsed by default with a chevron + count (`"3 coaching points"`, `typography.caption`, `colors.textSecondary`). Expands inline (layout animation, §9), revealing a bulleted list in `typography.callout`. Divider above the list = 1px `colors.borderSubtle`.

### Tag / Chip

Two distinct kinds — keep them visually separate.

**Filter chip** (selectable, e.g. library filters):

| State | Background | Text | Border |
|---|---|---|---|
| Default | `colors.surface` | `colors.textSecondary` | 1px `colors.border` |
| Selected | `colors.primaryTint` | `colors.primary` | 1px transparent |

- Height 34, horizontal padding `spacing.md` (12), radius `radius.pill`, label `typography.label`.
- Optional leading icon 16, gap `spacing.xs`.
- Horizontal scroll row: gap `spacing.sm`, `layout.screenPaddingX` content inset.

**Block-type tag** (read-only status label):

- Background = block tint, text = block base, `typography.overline` uppercase.
- Height 22, horizontal padding `spacing.sm`, radius `radius.sm`.
- Or a minimal **dot + label** form: 8px circle (block base) + `typography.label` text, no background — preferred inside dense lists.

### Input

| Property | Value |
|---|---|
| Height | 48 (single line) |
| Background | `colors.surfaceSunken` (filled style, preferred) |
| Border | none at rest in filled style; **focus** adds 1.5px `colors.primary` |
| Radius | `radius.md` (12) |
| Padding | horizontal 14, vertical 12 |
| Text | `typography.body`, `colors.textPrimary` |
| Placeholder | `colors.textTertiary` |
| Label (above) | `typography.label`, `colors.textSecondary`, margin-bottom `spacing.sm` |
| Helper / error | `typography.caption`; error text + 1.5px border `colors.error` |
| Multiline | min-height 96, `textAlignVertical: 'top'`, padding 12 |

Outline alternative (use on white-heavy screens): transparent fill, 1px `colors.border`, focus → 1.5px `colors.primary`.

### Bottom Sheet

Used for the canvas background picker and contextual pickers (e.g. object color, line-type selection). The Create button does **not** open a sheet — it opens the Canvas modal directly.

| Property | Value |
|---|---|
| Backdrop | `colors.overlayScrim`, fade in |
| Sheet background | `colors.surface` |
| Top radius | `radius.xxl` (28) on top corners only |
| Grabber | 36×4, `colors.border`, radius `radius.pill`, centered, `spacing.md` from top |
| Content padding | horizontal `layout.screenPaddingX`, top `spacing.lg`, bottom = safe-area inset + `spacing.xl` |
| Title | `typography.h2`, `spacing.lg` below grabber |
| Shadow | `shadow.lg` |
| Detents | content-height by default; large pickers use a ~90% detent |

Dismiss on backdrop tap and downward drag. Spring animation (§9).

### Tab Bar

Four slots: **Home · Create · Library · Lineups**. Create is a custom center button with **no screen of its own** — its `tabBarButton` calls `navigate('Canvas')`, opening the Canvas as a full-screen modal (per `architecture.md`). The **Lineups** tab (formerly Team) lists saved matchday lineups; a "+" on that screen opens the lineup editor as a full-screen modal.

| Property | Value |
|---|---|
| Height | 56 + bottom safe-area inset |
| Background | `colors.surface` |
| Top border | 1px `colors.borderSubtle` |
| Icon size | 24 |
| Label | `typography.caption` with `fonts.medium` |
| Active | icon + label `colors.primary`; consider filled icon variant |
| Inactive | icon + label `colors.textTertiary` |
| Item layout | icon over label, `spacing.xxs` gap, centered |

**Create button** (center): circular, 56×56, `radius.pill`, fill `colors.primary`, white `+` / whistle icon (24), `shadow.md`, raised ~`spacing.md` above the bar baseline. Press: scale `0.94` + `colors.primaryPressed`. It is **not** a tab — no active state, no label, no screen; it opens the Canvas full-screen modal.

### Navigation Bar (top)

Large-title pattern (Monarch / iOS), transparent over `colors.background`.

| Property | Value |
|---|---|
| Background | `colors.background`, no shadow; show 1px `colors.borderSubtle` bottom border only after scroll |
| Large title | `typography.h1`, `colors.textPrimary`, left-aligned, padding `spacing.lg` bottom |
| Collapsed title (on scroll) | `typography.h3`, centered |
| Height (content) | 44 + safe-area top inset |
| Back button | chevron 24 + optional `typography.body` label, `colors.primary` |
| Trailing actions | up to 2 icon buttons, 24 icon, 44 touch target, `colors.textPrimary` |
| Action spacing | `spacing.lg` between trailing actions |

The canvas uses its **own** dark bar (see §7), not this component.

---

## 7. Canvas Design Rules

The canvas is full-screen and full-bleed (`radius.none`). The pitch fills the viewport; chrome floats over it and is dark so the field reads clearly.

### Top bar (dark overlay)

- Background `colors.overlayBar`, or a top-down gradient from `rgba(20,22,24,0.72)` → `transparent` for a softer edge.
- Height 56 + safe-area top inset. Contents: back (left), session/activity title (`typography.h3`, `colors.textInverse`), actions (right: undo/redo, save, share/export).
- All icons/text `colors.textInverse`, icon size 22, `layout.touchTarget` hit areas.

### Tool palette (bottom)

- Floating rounded bar, **not** full-width: `colors.overlayBar`, `radius.pill`, `shadow.lg`, centered horizontally, sitting safe-area + `spacing.lg` from the bottom.
- Tool button: 44×44 touch target, icon 24, `colors.textInverse` inactive.
- **Selected tool**: 40×40 inner pill fill `colors.primary`, white icon.
- Internal padding `spacing.sm`, gap between tools `spacing.xs`.
- Tool groups (select, players, lines, equipment, text, erase) separated by a 1px `rgba(255,255,255,0.16)` divider.

### Background picker

Opens as a bottom sheet (§5) showing the six `CanvasBackground` options — full pitch, half pitch, final third, middle third, penalty box, blank — as 16:10 thumbnail tiles, `radius.md`, selected tile ringed 2px `colors.primary`.

### Player markers

| Property | Value |
|---|---|
| Diameter | 30 (default) |
| Shape | circle, `radius.pill` |
| Fill | `colors.surface` (white) by default; team color fills are an option |
| Border | 2px `colors.canvasInk` (or team color) |
| Label | optional 1–2 chars, centered, `typography.label` with `fonts.semibold`, `colors.canvasInk`. Maps to `PlayerMarker.label` (`''` = blank). **No jersey numbers by default** — the canvas label is independent of a roster jersey number. |
| Min touch target | 44 (use transparent hit area padding around the 30px visual) |

### Equipment icons

Curated set (cone, mini-goal, ball, pole, ladder, flag, marker disc). Render at 26×26 on canvas, monochrome `colors.canvasInk`, consistent visual weight with player markers. Selectable/movable like any object.

> Each equipment item is its own `PlacedObject` type — `Cone`, `Ball`, `Goal`/`MiniGoal`, `Pole`, `Ladder`, `Flag`, `Disc` — matching the existing per-type pattern (see `architecture.md`). No generic `equipment` + `variant` type: every item gets an explicit interface so `PlacedObject` switches stay exhaustively checked by TypeScript as the set grows.

### Movement lines & arrows

All strokes use rounded caps/joins. Default color `colors.canvasInk`; color is user-selectable per object.

| Line type | Meaning (`ArrowType`) | Spec |
|---|---|---|
| Solid | Pass (`pass`) | single stroke, width **2.5** |
| Double solid | Shot (`shot`) | two parallel strokes width **2.5**, gap **3** between centers |
| Dashed | Off-ball movement (`run`) | width **2.5**, dash pattern `[8, 6]` |
| Squiggly / wavy | Dribble (`dribble`) | width **2.5**, sine wave amplitude **5**, wavelength **16** |

- **Arrowhead**: filled triangle, length 12, width 10, at the terminal point, matching stroke color. Present on pass, shot, and movement lines; the dribble line ends in an arrowhead too.
- Drawn with React Native Skia paths. Keep stroke widths fixed in screen space (do not scale with zoom) so lines stay legible.
- Hit-testing: inflate the path by ~12px for selection.

### Object selection

- **Selection state**: 1.5px `colors.primary` bounding outline with `radius.sm`; for lines, highlight the path itself at width +1 in `colors.primary`.
- **Handles**: rotate/scale handles as 20px circles, white fill, 1.5px `colors.primary` border, `shadow.sm`. Touch target 44 via hit-slop.
- **Selection toolbar**: floating pill (`colors.overlayBar`, `radius.pill`, `shadow.md`) with contextual actions — duplicate, color, line-type (for lines), bring-to-front, delete. Icons 22, `colors.textInverse`; delete icon `colors.error`.
  - **Default position**: floats **above** the selected object, gap `spacing.sm`.
  - **Flip rule**: when the object's top edge sits within the **top 25%** of the canvas height, the toolbar **flips to below** the object (same gap) so it never collides with the dark top bar. Compute against canvas height, animate the reposition (§9).

### Layering (z-index intent)

Pitch background → drawn objects → selection outline/handles → selection toolbar → tool palette / top bar.

### Lineup view (reuses these primitives)

The lineup editor is not a separate visual system — it reuses the **pitch background** and **player markers** defined above. Editing starts with a **squad size** choice (7v7 / 9v9 / 11v11), which filters the formation list to that size's four options (three named formations + custom); changing squad size after positions are placed should warn before discarding them. A formation then arranges labelled player markers into positions on a full-pitch background; the same 30px marker, label typography (`fonts.semibold`), and touch-target rules apply. Differences from the drawing canvas: no arrows or equipment, markers snap to formation slots (or free-place under "custom"), and each marker's label is a player name/initials. The top bar and export affordance match the canvas. Keep the two visually consistent so a coach reads them as one app.

---

## 8. Icon Style

- **Style**: outline / line icons, stroke **1.75**, rounded caps and joins, drawn on a 24×24 grid.
- **Sizes**: 18 (inline/sm), 20 (buttons), 22 (nav/canvas), 24 (tab bar). Keep stroke weight visually constant across sizes.
- **Color**: inherits the surrounding text token (`colors.textPrimary` default, `colors.textTertiary` inactive, `colors.primary` active, `colors.textInverse` on dark).
- **Active tab variant**: solid/filled versions are acceptable for the active tab only; everywhere else stays outline.
- **Touch target**: always ≥ `layout.touchTarget` (44) via padding or `hitSlop`.
- **Library**: recommend a single consistent set (e.g. `lucide-react-native`) so stroke weight and corner treatment never drift. Canvas equipment/sport glyphs are a custom curated set matching the same weight.

---

## 9. Empty State Patterns

Empty states should feel intentional and inviting, never like an error or a nag (this mirrors the home screen's five adaptive states — a coach with little set up is never a second-class user).

**Anatomy**, vertically centered with generous whitespace:

```
        [ illustration / icon ]          ← optional, monochrome, light
              (spacing.xl)
            Headline                      ← typography.h2, textPrimary
              (spacing.sm)
   Supporting sentence, one or two        ← typography.callout, textSecondary,
   lines, calm and encouraging.             centered, max-width ~280
              (spacing.xl)
          [ Primary CTA ]                 ← one action, secondary/tonal button
```

| Property | Value |
|---|---|
| Container | centered, `paddingHorizontal: spacing.xxl`, top offset `spacing.xxxxl` |
| Illustration/icon | 64–96, `colors.textTertiary` or `colors.primaryTint` fill; keep it simple/monochrome |
| Headline | `typography.h2`, `colors.textPrimary`, centered |
| Body | `typography.callout`, `colors.textSecondary`, centered, max ~280px |
| CTA | single tonal button (`Secondary` variant), never more than one primary action |

Voice & content guidance per surface:
- **Library empty**: "No activities yet" → "Save a drill from the canvas to start your library." CTA: *Open canvas*.
- **Sessions empty**: "No sessions planned" → "Build a session from your saved activities." CTA: *New session*.
- **Lineups empty**: "No lineups yet" → "Set your matchday lineup and save it for the weekend." CTA: *New lineup*.

Tone is always forward-looking and optional — describe the reward, not the deficiency.

---

## 10. Motion & Animation

Restraint is the rule. Motion confirms an action or maintains spatial continuity; it never decorates. Use `react-native-reanimated`. Always respect `AccessibilityInfo.isReduceMotionEnabled` — when on, cut durations to 0 and skip non-essential transitions.

### Duration & easing tokens

| Token | Value | Use |
|---|---|---|
| `motion.fast` | 150ms | Press feedback, color/opacity changes. |
| `motion.base` | 220ms | Most enter/exit transitions, expand/collapse. |
| `motion.slow` | 320ms | Sheet present/dismiss, screen-level transitions. |
| `motion.easeStandard` | `Easing.bezier(0.2, 0, 0, 1)` | Default entrances/exits. |
| `motion.easeOut` | `Easing.out(Easing.cubic)` | Decelerating reveals. |
| `motion.spring` | `{ damping: 18, stiffness: 220, mass: 1 }` | Sheets, the selection toolbar, the Create button. |

### Patterns

- **Press feedback** (buttons, cards, tabs): `scale → 0.98` (0.94 for the Create button) + slight opacity/color shift over `motion.fast`. The single most important micro-interaction — apply it consistently.
- **Bottom sheet**: slide up + backdrop fade using `motion.spring`; dismiss reverses with `motion.slow` easing on the backdrop.
- **Coaching points expand/collapse**: animate height/layout with `motion.base` + `motion.easeStandard`; chevron rotates 90°. Use `LayoutAnimation` or Reanimated `withTiming` on measured height.
- **Selection toolbar flip**: when the top-25% rule triggers a reposition, animate the Y translation with `motion.spring` so it glides above/below rather than jumping.
- **Tab → Create sheet**: the Create button press triggers the sheet present; no screen transition.
- **Empty state / list load**: a single, subtle staggered fade-in (opacity + 8px translateY, `motion.base`, ~40ms stagger) on first mount only. One orchestrated reveal beats scattered micro-animations.
- **Avoid**: looping animations, parallax, bouncy overshoot on content, anything that draws the eye away from the coach's marks on the canvas.

---

## Appendix — `theme.ts`

Drop this in (e.g. `src/theme/theme.ts`) as the canonical import. Token names match every reference above.

```ts
export const colors = {
  primary: '#1A7A44',
  primaryPressed: '#155E36',
  primaryTint: '#E8F3EC',
  primaryTintStrong: '#CDE6D6',
  onPrimary: '#FFFFFF',

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSunken: '#F6F7F6',
  surfaceHover: '#F0F2F0',

  textPrimary: '#16181A',
  textSecondary: '#5C6166',
  textTertiary: '#9AA0A6',
  textDisabled: '#C2C7CC',
  textInverse: '#FFFFFF',

  borderSubtle: '#F0F1F2',
  border: '#E3E5E8',
  borderStrong: '#CBD0D4',

  success: '#16A34A',
  successTint: '#E7F6EC',
  warning: '#F59E0B',
  warningTint: '#FEF3E2',
  error: '#DC2626',
  errorTint: '#FCEAEA',
  info: '#3B82F6',
  infoTint: '#EAF1FE',

  overlayBar: 'rgba(20, 22, 24, 0.72)',
  overlayScrim: 'rgba(0, 0, 0, 0.40)',
  canvasInk: '#16181A',

  block: {
    warmup: '#F59E0B',      warmupTint: '#FEF3E2',
    technical: '#6366F1',   technicalTint: '#ECEDFD',
    possession: '#16A34A',  possessionTint: '#E7F6EC',
    pressing: '#DC2626',    pressingTint: '#FCEAEA',
    attacking: '#3B82F6',   attackingTint: '#EAF1FE',
    defending: '#EF4444',   defendingTint: '#FDECEC',
    transition: '#0891B2',  transitionTint: '#E3F4F8',
    game: '#7C3AED',        gameTint: '#F0E9FD',
  },
} as const;

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;
// If bundling .ttf files manually instead of @expo-google-fonts/poppins,
// change these to 'Poppins-Regular', 'Poppins-Medium', etc. Nothing else needs to change.

export const typography = {
  display:    { fontSize: 32, lineHeight: 40, fontFamily: fonts.bold,     letterSpacing: -0.5 },
  h1:         { fontSize: 24, lineHeight: 32, fontFamily: fonts.bold,     letterSpacing: -0.4 },
  h2:         { fontSize: 20, lineHeight: 28, fontFamily: fonts.semibold, letterSpacing: -0.3 },
  h3:         { fontSize: 17, lineHeight: 24, fontFamily: fonts.semibold, letterSpacing: -0.2 },
  body:       { fontSize: 16, lineHeight: 26, fontFamily: fonts.regular,  letterSpacing: 0 },
  bodyStrong: { fontSize: 16, lineHeight: 26, fontFamily: fonts.semibold, letterSpacing: 0 },
  callout:    { fontSize: 15, lineHeight: 22, fontFamily: fonts.regular,  letterSpacing: 0 },
  label:      { fontSize: 14, lineHeight: 20, fontFamily: fonts.medium,   letterSpacing: 0 },
  caption:    { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular,  letterSpacing: 0 },
  overline:   { fontSize: 11, lineHeight: 14, fontFamily: fonts.semibold, letterSpacing: 0.8, textTransform: 'uppercase' },
} as const;
// Weight is selected by fontFamily. Never set fontWeight with custom fonts —
// it renders unreliably (faux-bold / Regular) on Android.

export const spacing = {
  xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, xxxxl: 64,
} as const;

export const layout = {
  screenPaddingX: 20,
  sectionGap: 32,
  hitSlop: 8,
  touchTarget: 44,
} as const;

export const radius = {
  none: 0, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999,
} as const;

export const shadow = {
  none: { shadowColor: '#000', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  sm:   { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2,  shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md:   { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  lg:   { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
} as const;

export const canvas = {
  marker: { diameter: 30, border: 2 },
  equipment: { size: 26 },
  line: {
    strokeWidth: 2.5,
    doubleGap: 3,
    dash: [8, 6],
    waveAmplitude: 5,
    waveLength: 16,
    arrowHead: { length: 12, width: 10 },
    hitInflate: 12,
  },
  toolButton: 44,
  selectionTopFlipThreshold: 0.25, // flip toolbar below when object top is within top 25%
} as const;

export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
  spring: { damping: 18, stiffness: 220, mass: 1 },
} as const;

export const theme = { colors, fonts, typography, spacing, layout, radius, shadow, canvas, motion } as const;
export type Theme = typeof theme;
```

### Usage example

```ts
import { StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '@/theme/theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
});
```
