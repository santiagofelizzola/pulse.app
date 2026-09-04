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
    // The LINEUP circle marker (MarkerVisual), and the tool palette's marker-preview and
    // color-swatch chips — a 30pt chip centered in a 44pt button, holding a 14px "GK".
    diameter: 30,
    // The DRAWING-CANVAS player marker (PlayerMarkerOverlay, and getObjectFootprint's 'player'
    // case, which sizes the selection outline and places the rotate handle). Deliberately its
    // own value: the canvas marker and the lineup marker were one constant and are now
    // independent, so shrinking one can never move the other. The marker's TOUCH target is not
    // derived from this — useCanvasGestures hit-tests players against the flat HIT_RADIUS — so
    // the tap area stays 44pt-plus however small the visual gets.
    canvasDiameter: 24,
    // The LINEUP jersey marker's rendered width. An independent size, deliberately unrelated to
    // either diameter above — it used to be `diameter * 1.875`, which coupled the jersey to a
    // marker it only ever sat beside. What actually constrains it is the marker text: only the
    // torso panel can carry that text, the torso is 160 of the asset's 312 viewBox units, and
    // the widest role the app generates is "CM" at 23.34pt (14px Poppins SemiBold, measured).
    // 49.5 puts the torso at 25.4pt seam to seam. The asset's stroke-width is calibrated against
    // THIS number so the outline renders 2pt like the circle marker's border — change one and
    // re-derive the other (assets/icons/jersey.svg carries the formula).
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
