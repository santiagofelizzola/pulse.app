# Pulse — Design System

> Single source of truth for visual design. Reference this document when building any component. All tokens map directly to React Native `StyleSheet` values (unitless density-independent pixels, hex color strings, string font weights).

---

## 0. Design Philosophy

Pulse is a calm, premium tool for solo youth soccer coaches. The interface should feel like a well-organized clipboard, not a dashboard.

Three principles govern every decision, drawn from our references:

1. **Content leads, UI disappears** *(Monarch)*. White surfaces, hairline borders over heavy shadows, generous whitespace. Color is an accent, never a wallpaper. A screen at rest should look almost empty.
2. **The pitch is the canvas** *(SoccerDrive)*. On the drawing canvas the floating chrome goes dark and recedes; the field (white, with dark line markings) and the coach's marks are the only things that matter.
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

These eight values are the canonical `BlockType` set and match the `BlockType` enum in `architecture.md`. They color-code **session blocks** (the card's left bar). Library filter chips key off `ActivityTag`, a wider set (adds `finishing`, `set-piece`, `rondo`, `position-play`, `training-game`) — those chips use the standard filter-chip treatment (§6), **not** per-tag colors, so no extra tokens are needed for them, and the tag set can keep growing without touching this palette.

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
| `radius.pill` | 999 | Filter chips, primary CTA pills, player markers. |

---

## 5. Elevation / Shadow

Prefer **hairline borders** over shadows (Monarch). Use shadow only to lift floating elements (sheets, the canvas tool palette, selection toolbar). Shadow tokens include iOS keys and Android `elevation`.

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
| Pressed (if tappable) | background `colors.surfaceHover`, scale `0.98` |

> The pressed scale is **0.98**, the single value in §10. This row previously said `0.99`; the two specs disagreed and the code has only ever had one constant (`usePressAnimation`), so the Card row was corrected to match rather than the other way round.

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
- **Coaching points**: collapsed by default with a chevron + count (`"3 coaching points"`, `typography.caption`, `colors.textSecondary`). Expands inline (layout animation, §10), revealing a bulleted list in `typography.callout`. Divider above the list = 1px `colors.borderSubtle`. Stored as one freeform string, **one point per line** — every surface that displays them shares a single splitter, because the export's page-height budget depends on the line count being exact.

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

Used for the canvas background picker, the save/edit sheets, and the lineup Appearance sheet. The Training tab does **not** open a sheet — it opens the Canvas modal directly. Canvas *tool* options — player presets, ball variants, zone shapes, color swatches — are **not** sheets: they are popovers anchored to their own tool button in the tray (§7).

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

Dismiss on backdrop tap and downward drag. Spring animation (§10).

**A sheet that can outgrow the screen caps its own content.** `BottomSheet` does not scroll; the sheet inside it wraps its content in a `ScrollView` with a `maxHeight`. Two sheets have now independently needed this — Edit activity (cap 480) and Save activity (cap 280) — and the caps differ because they are budgeted against the shortest supported phone: a sheet that **autofocuses** a field has the keyboard up from the moment it opens and gets far less room than one that doesn't. A sheet that autofocuses also needs `keyboardShouldPersistTaps="handled"`, or the first tap on any control is swallowed by the keyboard dismissal instead of reaching it. **If a third sheet needs this treatment, the pattern belongs in `BottomSheet` itself** rather than a third hand-tuned copy.

### Tab Bar

Three equal-width slots: **Library · Training · Lineups**, with **Training in the center**. No Home tab, no landing dashboard, no raised center button — all three are regular equal-width tab items with the same layout and touch target. **Training** has no screen of its own: its `tabPress` is intercepted (`preventDefault()` + `navigate('Canvas')`), so tapping it opens the Canvas as a full-screen modal instead of switching tabs (per `architecture.md`). Center placement is deliberate — Training is the primary action, and the center slot puts it under the thumb where the old Create button sat. The **Lineups** tab (formerly Team) lists saved matchday lineups; a "+" on that screen opens the lineup editor as a full-screen modal.

| Property | Value |
|---|---|
| Height | 56 + bottom safe-area inset |
| Background | `colors.surface` |
| Top border | 1px `colors.borderSubtle` |
| Icon size | 24 |
| Label | `typography.caption` with `fonts.medium` |
| Active | icon + label `colors.primary` |
| Inactive | icon + label `colors.textTertiary` |
| Item layout | icon over label, `spacing.xxs` gap, centered, equal-width flex across all three tabs |

Icons (from Lucide):
- **Training** → `soccerBall` (a paneled soccer ball) — from `@lucide/lab`, rendered via `<Icon iconNode={soccerBall} size={24} />`.
- **Library** → `Folder` — from the main `lucide-react-native` package, rendered via `<Folder size={24} />`.
- **Lineups** → `soccerPitch` (a soccer field) — from `@lucide/lab`, rendered via `<Icon iconNode={soccerPitch} size={24} />`.

Two of the three (`soccerBall`, `soccerPitch`) live in the separate `@lucide/lab` package, so it must be installed alongside `lucide-react-native`; both use the `Icon iconNode={…}` form rather than a named component. `Folder` is a normal named import. Color follows the active/inactive rows above (`colors.primary` / `colors.textTertiary`) via the `color` prop; since these are stroke icons there is no filled active variant — drop the "consider filled icon variant" note for this tab bar and rely on color alone for the active state.

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

The canvas uses its **own** light bar (see §7), not this component.

---

## 7. Canvas Design Rules

The canvas screen is **one continuous light surface** (`colors.background`), not a full-bleed dark-chrome-over-white-pitch composition — reference: SoccerDrive/Sogility. The pitch is fit to its background's own aspect ratio rather than stretched to fill the viewport, centered with margin above/below/beside it, bordered with a thin `colors.canvasInk` hairline so its edge reads clearly against the page — no dark margin framing it. **On the drawing canvas the pitch surface stays white (`colors.background`) with dark line markings (`colors.canvasInk`)** for legibility and print-friendliness; what changed is the chrome around it, not the pitch rendering itself. Top bar and tools are both light and sit **outside** the pitch (tools below it, not floating over it) rather than as dark overlays receding over the field.

> The white pitch is the **default surface**, not the only one. Lineups can choose a surface preset per lineup — see *Pitch styles* below. The drawing canvas offers no such picker.

**Aspect ratio is per background**, not one constant. `canvas.pitchAspectRatio` (68:105 — a real pitch rotated to portrait) covers full-pitch, blank, **and the two blank splits** (halves and thirds — they are the blank surface with dividers drawn on it, so they take its frame and its aspect exactly, listed explicitly rather than left to a `default` branch); a half pitch, a third and the penalty-box crop each derive their own from real pitch dimensions, so a cropped background gets a shorter frame rather than the same tall shape with empty grass below it.

### Top bar (light)

- Background `colors.background`, distinguished from the pitch area below by a 1px `colors.borderSubtle` bottom border rather than a dark fill.
- Height 56 + safe-area top inset. Contents: back (left), session/activity title (`typography.h3`, `colors.textPrimary`), actions (right: undo/redo, save, share/export). The back action (and the modal's swipe-down dismiss) triggers the unsaved-changes confirm prompt when there are unsaved marks — see the unsaved-changes guard in `architecture.md`.
- All icons/text `colors.textPrimary`, icon size 22, `layout.touchTarget` hit areas.

### Tool tray (below the canvas)

- Sits in normal layout flow **below** the pitch, not a floating overlay: `colors.background`, 1px `colors.borderSubtle` top border, no pill/tray fill, no shadow.
- Laid out as **two fixed rows**, not a scrollable strip, so every tool is visible at once on a portrait screen. Row 1: Player, Cone, Goal, Mini-goal, Ball. Row 2: Zone, the four arrow types, Color. Two rows is a budget, not a coincidence — a third would cost the pitch roughly 60px of height.
- Tool button: 44×44 touch target, icon 24, `colors.textPrimary` inactive.
- **Selected tool**: `colors.primaryTint` circular fill behind the icon, icon `colors.primary` (same selected treatment as a filter chip — see §6).
- Gap between tools `spacing.sm`. No `hitSlop` is added: the buttons are already at the 44px minimum, and expanding them across an 8px gap would overlap neighbors' touch areas.
- **Three tools open a popover** rather than placing directly: Player (blank/GK/Co), Ball (BW/colored) and Color (the swatch grid). **Zone places directly** — it used to offer rect/circle, and with the circle gone a popover holding one option is a tap the coach shouldn't have to make. Each popover is a small light overlay (`colors.surface`, 1px `colors.border`, `shadow.md`) anchored above its own button — the one legitimate floating-shadow use here, since it's transient, not the tray itself. The popover pins its **left or right edge** to its button (whichever screen edge the button is nearer) and grows inward, rather than centering and risking overflow. The color popover is the one that wraps: ten swatches at five per row.

### Background picker

Opens as a bottom sheet (§6) showing the seven `CanvasBackground` options — full pitch, half pitch, final third, penalty box, blank, halves, thirds — as 16:10 thumbnail tiles, `radius.md`, selected tile ringed 2px `colors.primary`. The grid wraps two per row on any supported width, so that is **four rows with a single tile on the last**.

**Halves and thirds** are the blank surface divided into equal horizontal bands: dividers running across the width, bands stacking top to bottom, no touchline rect and no pitch markings. The dividers run the **full frame width** rather than inset by the pitch margin — `blank` has no inset play area to align to, and a divider that stopped short would read as a marking on a pitch rather than a division of the surface.

**Middle third was removed.** It still appears in stored drills, and resolves to **final third** — chosen for geometry, not markings: the two share an aspect ratio exactly, so a drill's objects land where they always did rather than reflowing. What changes underneath them is a goal box instead of a halfway line and centre circle. (Halves is closer by markings, but would reflow the drill into a frame nearly twice as tall.) The picker maps over a single shared option list, so a new preset is one entry there plus a branch in `PitchBackground` — never a second list to keep in sync.

### Player markers

> **Two sizes, two tokens.** The drawing-canvas marker and the lineup marker were one constant and are now independent, so shrinking one can never move the other. This table is the **drawing-canvas** marker. The lineup marker is 30 — see *Marker styles* below.

| Property | Value |
|---|---|
| Diameter | **24** (`canvas.marker.canvasDiameter`). The lineup circle marker and the tool palette's marker-preview and color-swatch chips stay at **30** (`canvas.marker.diameter`) |
| Shape | circle, `radius.pill` |
| Fill | **`colors.canvasInk` (black)** for a newly placed marker, stamped onto the object at creation. A marker with no stored `color` — every one saved before this default existed — still renders `colors.surface` (white). See the note below |
| Border | 2px `colors.canvasInk` (or team color) |
| Label | optional 1–2 chars, centered, **`typography.caption`** (13px) with `fonts.semibold` — not the 14px `typography.label` the lineup marker keeps. The shape forced it: 24pt with a 2pt border leaves 20pt of clear interior, and "GK" (the wider of the two presets) measures 20.0pt at 14px against 18.6pt at 13px. Ink is `colors.canvasInk` on a light fill and flips to `colors.textInverse` on a dark one — perceived brightness (ITU-R BT.601), not a full contrast ratio, which is enough for a fixed swatch set. The flip is unchanged, but the *common* case inverted with the black default: a new marker now carries white ink, and a legacy uncolored (white) one keeps dark ink. Maps to `PlayerMarker.label` (`''` = blank). **No jersey numbers by default** — the canvas label is independent of a roster jersey number. |
| Palette presets | The players tool offers three quick options: a plain (blank-label) marker, and two labelled presets — **GK** and **Co** — which simply place a marker with that `label` value. All other labels are entered ad-hoc. No non-circle player shapes (triangle/square/etc. belong to equipment/zones, not markers). |
| Min touch target | 44+, and **not derived from the diameter** — players are hit-tested against a flat `HIT_RADIUS`, so the tap area is unaffected by how small the visual gets |

> **The black default does not repaint existing drills.** It is set explicitly on the object at creation, *not* by moving the renderer's `color ?? colors.surface` fallback. Moving the fallback would silently reflow every marker in the library to black — and leave each saved drill disagreeing with its own stored thumbnail PNG, which was captured white. So `color` stays optional on `PlayerMarker`: old drills keep their white markers, only new ones come out black.

### Equipment icons

Placeable set: **cone, goal, mini-goal, and two balls** (black-and-white, colored). Rendered from **vector SVG assets** in `assets/icons/`, loaded via Skia's SVG support, sized for consistent visual weight next to player markers. Selectable/movable like any object.

- **Assets are pre-cleaned and pre-colored offline**, not recolored at runtime. DOCTYPE and CSS are stripped so Skia's parser — which does no CSS cascade resolution — reads them natively, and each file already carries the right ink for a white pitch. The one runtime substitution is a literal text replace for `currentColor`, which Skia won't resolve on its own.
- **Sizing is calibrated per asset, not declared.** Each source file has a different viewBox and a different amount of empty margin around its ink, so identical width numbers render at visibly different sizes. The stored width for each asset is a *measured* value correcting for that, so equal numbers produce equal footprints. The rule: everything renders clearly smaller than the player marker **except the full goal**, which stays large by design. Note the numbers were calibrated against a **30pt** marker and have deliberately **not** been re-derived since the canvas marker dropped to 24 — cone and balls at 17pt now sit closer to it than intended, but re-calibrating every asset would change how every drill already in the library exports, for a hierarchy that still reads.
- **Per-object color is an armed tool, not a per-object edit.** `Cone`, `Disc` and `PlayerMarker` each carry an optional `color`; balls, goals and zones are deliberately not colorable and carry no `color` field, and arrows are not `PlacedObject`s at all and stay `canvasInk`. Colour is armed from the tool tray's Color slot with a chosen swatch and **stays armed**, repainting each colorable object the coach taps. Rules while armed:
  - A tap **never selects** — arming the tool clears any live selection, so the two meanings of a tap cannot collide. Dragging an object still moves it.
  - A tap on anything that isn't a colorable object — an arrow, a ball, a goal, empty grass — is a deliberate no-op: no recolor, no selection, no placement, and the tool stays armed.
  - The armed color **does not inherit** to newly placed objects. It is not a default; it only ever repaints what is tapped.
  - **Exit** is re-tapping the armed swatch, which disarms back to Select — the same toggle-off every other tool in the tray has, and the tool's only exit.
  - Armed, the Color button renders as the color itself (a filled chip with a hairline border, so the white swatch stays visible); idle, it is the plain palette icon.
- **Preset swatches only** — no arbitrary color entry. The canvas tool offers ten, ordered to wrap into two rows of five, including white: white would be an invisible cone on a white pitch, but a player marker always carries a 2px `canvasInk` border, so it reads as the natural opposing-team fill. The lineup Appearance sheet deliberately kept its own narrower list rather than inheriting this widening.
- The **disc** is drawn as two concentric circles (an outer filled circle in the object color, a smaller white inner circle), not a flat ellipse.
- **Goal & mini-goal** are two distinct SVG assets, not one frame scaled.

> Each equipment item is its own `PlacedObject` type — `Cone`, `Ball`, `Goal`/`MiniGoal`, `Pole`, `Ladder`, `Flag`, `Disc` — matching the existing per-type pattern (see `architecture.md`). No generic `equipment` + `variant` type: every item gets an explicit interface so `PlacedObject` switches stay exhaustively checked by TypeScript as the set grows. Pole, ladder, flag and disc keep their types but are **not in the palette**.

### Shapes

One zone object — a **rectangle** (`Zone`) — drawn on the pitch to mark an area.

- **Placed by drag, not by tap.** Touch-down and release are the rectangle's opposite corners, with a live preview while dragging. Sizing a zone is the point of it, so placing and sizing are one gesture.
- A very short drag still yields a usable shape: the footprint is floored at 40px.
- After placing, the tool disarms back to select.
- **The drag is the only sizing.** There is no resize afterwards — the rectangle's width/height handle went with the scale handle (see *Object selection*). A zone's size is fixed once placed.

> **The circle zone left the palette.** `CircleZone`, its interface and its renderer all remain, exactly the way pole/ladder/flag/disc remain: saved drills contain circle zones and must keep rendering them, and they are still selectable and hit-tested. Only the placement affordance is gone. It was placed the same way — touch-down and release as the endpoints of a diameter.

### Movement lines & arrows

All strokes use rounded caps/joins. Default color `colors.canvasInk`; color is user-selectable per object.

| Line type | Meaning (`ArrowType`) | Spec |
|---|---|---|
| Solid | Pass (`pass`) | single stroke, width **2.0** |
| Double solid | Shot (`shot`) | two parallel strokes width **2.0**, gap **3** between centers |
| Dashed | Off-ball movement (`run`) | width **2.0**, dash pattern `[8, 6]` |
| Squiggly / wavy | Dribble (`dribble`) | width **2.0**, sine wave amplitude **5**, wavelength **16** |

- **Arrowhead**: filled triangle, length 12, width 10, at the terminal point, matching stroke color. Present on pass, shot, and movement lines; the dribble line ends in an arrowhead too.
- Drawn with React Native Skia paths. Keep stroke widths fixed in screen space (do not scale with zoom) so lines stay legible.
- Hit-testing: inflate the path by ~12px for selection.

### Object selection

- **Selection state**: 1.5px `colors.primary` bounding outline with `radius.sm`; for lines, highlight the path itself at width +1 in `colors.primary`.
- **Handles**: **rotate is the only handle** — a 20px circle, white fill, 1.5px `colors.primary` border, `shadow.sm`, floating above the object. Touch target 44 via hit-slop.
  - **Removed: the scale handle** that sat on the bottom-right corner, and the independent width/height resize it forked into on a rectangle. An object's size is now fixed once placed. The *data* is untouched — `scale` on every object and `width`/`height` on `Zone` are still stored and still rendered from, so a drill saved while scaling existed renders exactly as it did; the selection outline still hugs the size the object actually renders at. What went is the gesture, not the geometry.
- **Selection toolbar**: floating pill (`colors.overlayBar`, `radius.pill`, `shadow.md`) with two actions — **duplicate** and **delete**. Icons 22, `colors.textInverse`; delete icon `colors.error`. Two actions previously listed here are gone: **color** became an armed tool in the tray (above), and **bring-to-front** was removed outright (see Layering).
  - The pill's own background is pass-through (`pointerEvents="box-none"`); only its buttons catch touches, so a tap landing on the padding between icons still reaches the canvas and deselects.
  - It is rendered as a **sibling** of the canvas gesture view, not a descendant — its buttons use RN's classic touch responder, which otherwise races with (and beats) the pan recognizer for touches elsewhere on the canvas. For the same reason its buttons are the one interactive surface in the app with no press animation.
  - **Default position**: floats **above** the selected object, gap `spacing.sm`.
  - **Flip rule**: when the object's top edge sits within the **top 25%** of the canvas height, the toolbar **flips to below** the object (same gap) so it never collides with the top bar. Compute against canvas height, animate the reposition (§10).
  - **Not built**: a **line-type** action for switching a drawn arrow between pass/shot/run/dribble after the fact. Specified here, not implemented — the line type is fixed at draw time.

### Layering (z-index intent)

Pitch background → drawn objects → selection outline/handles → selection toolbar → tool palette / top bar.

Within "drawn objects", **objects and arrows share a single stacking order** even though they live in two arrays — so a newly drawn line genuinely lands above existing equipment, not merely above other lines. The order is computed from current state rather than a persisted counter, so it needs no undo/redo bookkeeping of its own.

> There is **no *bring to front* action**. It was removed from the selection toolbar; the shared counter and every stored `zIndex` are untouched, so the model above still holds and the action could return without a data change.

### Lineup view (reuses these primitives)

The lineup editor is not a separate visual system — it reuses the **pitch background** and **player markers** defined above. Editing starts with a **squad size** choice (7v7 / 9v9 / 11v11), which filters the formation list to that size's four options (three named formations + custom); changing squad size after positions are placed warns before discarding them. A formation then arranges labelled player markers into positions on a full-pitch background; the same 30px marker, label typography (`fonts.semibold`), and touch-target rules apply. Differences from the drawing canvas: no arrows or equipment, markers snap to formation slots (or free-place under "custom"), and each marker's caption is a player name/initials. The top bar and export affordance match the canvas. Keep the two visually consistent so a coach reads them as one app.

Below the pitch sits a **subs row** — a horizontally scrolling row of pill chips (filter-chip metrics, §6) plus a tonal "+ Add sub" chip. Substitutes are a name and an optional position, not markers on the pitch.

Unlike the drawing canvas, a lineup's **appearance is saved with the record** and chosen in one Appearance sheet. Four choices, all per lineup:

#### Pitch styles

The pitch renderer is **value-driven**: it draws whatever a style object describes and never learns preset names. A preset is a new entry in the style map plus a new union member — never new rendering code.

| Field | What it governs |
|---|---|
| `bands` | Band colors, applied top to bottom and cycled. A single entry is a flat surface |
| `striped` | Whether `bands` repeats down the pitch as mowing stripes, or fills flat with `bands[0]` |
| `lineColor` | The pitch markings drawn over the bands |
| `captionColor` | Text sitting directly on the surface — the player-name captions. Part of the style because a dark caption vanishes on a dark surface |
| `captionOutlineColor` | Outline stroked around that caption's letterforms, always the opposite tone to `captionColor`. It is what keeps a name legible where it crosses a stripe boundary or a marking |
| `bandCount?` | Stripe count override; falls back to `canvas.pitch.bandCount` (11 — odd, so top and bottom bands match and one band centers on the halfway line) |

Two presets ship: **White** (flat white, dark markings — the default, matching the drawing canvas) and **Green stripes** (two-tone mown turf, white markings and captions). An unrecognized stored value resolves back to White rather than failing to render.

#### Caption outline

The name caption is a **stroked outline around the letterforms**, not a halo behind them. It replaced a soft glow, and the mechanics are worth stating because they constrain the caption in ways the glow did not:

- **The caption is SVG text, drawn twice.** `react-native-svg` has no paint-order support, so a stroke on a single text node is centred on the glyph outline *and* painted over the fill — it eats half the letter weight inward and thickens 13px type into mush. The fix is two copies: a stroke-only copy underneath at **double** the intended width, then the filled copy on top. Only the outer half of that stroke survives, which is a true outline rather than a halo.
- `canvas.marker.captionOutline.width` is therefore the **total** stroke width; the visible outline is half of it.
- **The outline colors are near-opaque, not low-alpha.** A halo spreads over several pixels and can afford to be faint; a 1pt stroke at low alpha just lets the stripe seam read straight through it.
- **Trade: SVG text does not ellipsize.** It clips at the viewport edge with no `…`. The caption box is given its own width (wider than the marker's 72pt container), so a real first name fits — about **14 characters** at 13px SemiBold, clipping with no ellipsis beyond that. The previous RN text ellipsized at roughly 10. The container is deliberately *not* widened to match: its width **is** the marker's touch target, and stretching it would overlap the hit areas of neighbouring players in a back four. Both platforms leave the overflow visible and neither delivers touches outside a parent's bounds, so the wider caption draws in full without becoming tappable.
- The SVG viewport is a hard clip, so the caption box is padded by the full stroke width on every side (otherwise the outline on a descender is sliced off) and the same amount comes back off its top margin, so nothing moves.

#### Marker styles

**Circle** — the **30px** lineup marker (`canvas.marker.diameter`; the drawing-canvas marker is 24 and independent, see *Player markers*) — or **Jersey**, a shirt silhouette. Three calibrations make the jersey work:

- **Width is its own token: `canvas.marker.jerseyWidth: 49.5`**, with *no* arithmetic relationship to either marker diameter. It used to be `diameter × 1.875` (= 56.25), which coupled the jersey to a marker it merely sits beside and made a jersey change impossible without touching the circle. 49.5 is **12% down** from that.
  - **What sets the floor is the marker text, not the circle.** Only the torso panel can carry text, and the torso is 160 of the asset's 312 viewBox units — 0.513 × the rendered width. The widest role the app generates is **"CM" at 23.34pt** (14px Poppins SemiBold, measured from the shipped `.ttf`); GK is 20.03 and a two-digit shirt number never exceeds 18.1. At 49.5 the torso is 25.4pt seam to seam, leaving a **23.39pt** clear panel — 0.05pt of margin. Below roughly 49.4 the letters start crossing the seam.
  - **A 20% cut was not achievable.** 45.0pt gives a clear panel of about 21.1pt, well under the 23.34pt the label needs.
  - **The SVG asset was re-derived to match.** Stroke-width and viewBox are coupled — the stroke sets the stroked bounds, which set the box, which sets the render scale, which sets what the stroke renders as — so they are solved together, not in sequence: `stroke-width="12.606"` in a 312-wide box scales by 49.5/312 and lands at **2.00pt on screen**, parity with the circle marker's 2px border. Because the vertical squash makes the scale non-uniform, one stroke-width cannot render evenly on both axes — the side edges scale by x (2.00pt), the top and bottom by y (1.50pt). It is calibrated to the **sides**, the long visually dominant edges and the ones sitting next to the circle marker's border. Change `jerseyWidth` and re-derive the stroke; the formula lives in `assets/icons/jersey.svg`. (The previous calibration was stroke 11 in a 310-wide box at 56.25.)
- Height is **75% of its natural aspect**, not the viewBox's. The source art reads as a tank top at marker size; squashing makes it wider than tall, which is how a real shirt reads with the sleeves out.
- The marker text centers on the **chest, not the bounding box** — the collar eats the top, so box-centered text rides up onto the neck.

Kit fill and outline are independent colors in the asset, so the outline stays a fixed tone whatever the kit color.

#### Marker label — blank / number / position

What every marker shows **inside** its shape. The name caption below the marker is unaffected and always shows.

- **Blank** (default) — clean markers. A coach opts in to annotation rather than clearing a default.
- **Number** — the shirt number. Numbers are assigned the moment this mode is first chosen and are freely overridable; a player without one renders blank rather than falling back to a role, because the mode is a promise about what the text means.
- **Position** — the role abbreviation (GK, CB, ST, …).

Switching away keeps numbers stored but unrendered, so a trip through the other modes and back shows the same numbers.

#### Team & keeper colors

Two swatches: **team color** fills every outfield marker, **keeper color** the one goalkeeper. The picker leads with an explicit **white** swatch — white is what an uncolored marker already renders as, and without it a coach who tried a kit color had no way back to the default. Label ink flips for contrast exactly as on the canvas.

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

Empty states should feel intentional and inviting, never like an error or a nag — a coach with little set up is never a second-class user.

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

> **Reduce-motion compliance is currently partial.** The shared `useReduceMotion` hook exists and press feedback honours it (durations drop to 0). The bottom sheet's present/dismiss and the selection toolbar's flip spring do **not** yet consult it. Unclaimed work, not a changed intent.

### Duration & easing tokens

| Token | Value | Use |
|---|---|---|
| `motion.fast` | 150ms | Press feedback, color/opacity changes. |
| `motion.base` | 220ms | Most enter/exit transitions, expand/collapse. |
| `motion.slow` | 320ms | Sheet present/dismiss, screen-level transitions. |
| `motion.easeStandard` | `Easing.bezier(0.2, 0, 0, 1)` | Default entrances/exits. |
| `motion.easeOut` | `Easing.out(Easing.cubic)` | Decelerating reveals. |
| `motion.spring` | `{ damping: 18, stiffness: 220, mass: 1 }` | Sheets, the selection toolbar. |

### Patterns

- **Press feedback** (buttons, cards, tabs): `scale → 0.98` + opacity → 0.96 over `motion.fast`. The single most important micro-interaction — apply it consistently, through the one shared hook so the response is identical everywhere. It is the sole spec of the pressed scale; §6's Card row defers to this value.
  - **Deliberate exclusions**, each for a reason rather than an oversight: the **bottom-sheet backdrop scrim** (a dimming plane, not a control); the **two canvas deselect wrappers** (the top bar and the tool tray, whose `onPress` is *deselect* — scaling a whole bar on a stray tap would be wrong); the **selection toolbar's buttons** (their classic-touch-responder Pressables race with the gesture-handler pan recognizer, see §7); and the **tab items** (React Navigation's default treatment — changing it needs a custom `tabBarButton`).
  - **Known gap**, not a decision: the session-builder block card's five controls are still unanimated.
- **Bottom sheet**: slide up + backdrop fade using `motion.spring`; dismiss reverses with `motion.slow` easing on the backdrop.
- **Coaching points expand/collapse**: animate height/layout with `motion.base` + `motion.easeStandard`; chevron rotates 90°. Use `LayoutAnimation` or Reanimated `withTiming` on measured height.
- **Selection toolbar flip**: when the top-25% rule triggers a reposition, animate the Y translation with `motion.spring` so it glides above/below rather than jumping.
- **Training tab → Canvas**: pressing the Training tab opens the Canvas modal directly (standard modal present transition); no sheet, no intermediate screen.
- **Empty state / list load**: a single, subtle staggered fade-in (opacity + 8px translateY, `motion.base`, ~40ms stagger) on first mount only. One orchestrated reveal beats scattered micro-animations. **Not built** — specified here, with no entrance animation implemented on any list or empty state.
- **Avoid**: looping animations, parallax, bouncy overshoot on content, anything that draws the eye away from the coach's marks on the canvas.

---

## 11. Export Artifacts

What leaves the app and lands in a team chat. The governing rule: **an artifact is the diagram, full bleed.** No title, no metadata block, no footer, no watermark — what the coach sees in the editor is exactly what lands in the file.

### Palette

Templates **never import `colors`**. They take an `ExportPalette` — a narrow subset of tokens (background, surface, text, borders, accent, the block-type pairs) passed in as an argument. Exports are always light today; the indirection means a future dark export is a parameter, not a rewrite of every template.

A lineup's own `pitchStyle` and `markerStyle` are **record data, not theme** — they stay driven by the saved lineup, so no palette change can ever repaint a coach's white pitch green.

### Fidelity

The app's own components render the artifact — the same pitch and diagram components the editors use. An export that draws its own version of the pitch is an export that silently stops matching the app.

Canvas geometry is in **absolute points** (24pt canvas markers / 30pt lineup markers, 26pt equipment, 2pt pitch lines, a 20pt margin, 13–14pt captions), so drawing straight into a small slot does not shrink a pitch — it inflates everything on it: markers jump from 8% of pitch width to 12%, and the inner margin becomes a fat white gap. Diagrams are therefore drawn at a **360pt reference width** and the *rendered result* is scaled into its slot. Scaling is essentially always down, so it costs nothing in sharpness.

### Session PDF pages

Pages are **360×640pt** — phone-shaped, never A4. A4 fit to a phone screen renders 15pt body text at about 7pt; a 9:16 page fills the screen edge to edge at fit-width, so type reads at its true size.

| Page | Contents |
|---|---|
| Cover (Full plan only) | Session title, duration · block count · players, focus, running order with block-type dots, coaching moments |
| Detail (Full plan) | One drill: block tag + duration, title, diagram, coaching points |
| Overview card | Block-type color bar (4px), diagram, title, block tag + duration |

Overview cards **divide the page body evenly**, so a page fills whether it carries three activities or six, and a short final page gets taller cards rather than a hole. Card height is floored (below which a card can't hold a name, a tag and a legible diagram) and capped (so a two-activity session doesn't stretch each card to a third of a page).

Every page carries a one-line footer: session name · page *n* of *m*. This is the **one place** an artifact carries chrome — a multi-page document read on a phone needs to say where you are in it.

> **Nothing on a page shrinks to fit.** Flex children don't compress by default, so an underestimated text height doesn't squeeze the layout — it pushes the last line straight through the footer rule. Height budgets are computed from real laid-out values, and coaching points are counted as *rendered lines* (one point per line, plus wrapping), never as raw character count.

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
  marker: {
    // The LINEUP circle marker, and the tool palette's marker-preview and color-swatch chips.
    diameter: 30,
    // The DRAWING-CANVAS player marker. Deliberately its own value — the two were one constant
    // and are now independent, so shrinking one can never move the other. The marker's TOUCH
    // target is not derived from this; players are hit-tested against a flat HIT_RADIUS.
    canvasDiameter: 24,
    // The LINEUP jersey marker's rendered width. Unrelated to either diameter above — it used to
    // be `diameter * 1.875`. What constrains it is the marker text: the torso is 160 of the
    // asset's 312 viewBox units, and the widest role the app generates is "CM" at 23.34pt. The
    // asset's stroke-width is calibrated against THIS number so the outline renders 2pt — change
    // one and re-derive the other (assets/icons/jersey.svg carries the formula).
    jerseyWidth: 49.5,
    border: 2,
    // The stroke around the player-name letterforms, drawn beneath the fill. This is the TOTAL
    // stroke width: it is centered on the glyph outline, so the fill covers the inner half and
    // the visible outline is half this value. See LineupMarker.
    captionOutline: { width: 2 },
  },
  equipment: { size: 26 },
  pitchLine: { width: 2 },
  // Pitch surface palette. Consumed only by utils/pitchStyles.ts, which assembles these into the
  // PitchStyleValue objects PitchBackground renders from — components never name a pitch color.
  pitch: {
    white: '#FFFFFF',
    ink: '#16181A',
    turfDark: '#357007',
    turfLight: '#4F980C',
    // Caption outline: the stroke around the player-name letterforms, always the opposite tone
    // to the caption itself, so the letters separate from whatever they sit on (mowing stripes,
    // a marking line). Near-opaque, unlike the soft halo this replaced — a halo is spread over
    // several pixels and can afford to be faint, but a 1pt stroke at low alpha just lets the
    // stripe seam read straight through it.
    outlineLight: '#FFFFFF',
    outlineDark: '#16181A',
    // Mowing bands drawn across the pitch height. Odd, so the top and bottom bands share a shade
    // (symmetric) and one band sits centered on the halfway line.
    bandCount: 11,
  },
  // width:height for a portrait pitch (a real pitch is ~105x68 length:width; rotated to
  // portrait that's width:height = 68:105). The canvas is fit to this ratio, not full-bleed,
  // so pitch markings stay proportionally correct instead of stretching to fill the screen.
  pitchAspectRatio: 68 / 105,
  line: {
    strokeWidth: 2.0,
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
