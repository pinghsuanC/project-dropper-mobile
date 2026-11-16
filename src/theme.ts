// The only place colours, fonts, sizes and spacing are defined. Components and screens use
// these tokens by name, never raw values (CLAUDE.md "UI style", records 2020 and 2030).

/** 2030: one fixed light palette. */
export const colors = {
  // Surfaces
  desktop: '#008080',
  face: '#c0c0c0',
  field: '#ffffff',
  tooltip: '#ffffe1',
  terminal: '#000000',
  // Bevels and title bars
  bevelLight: '#ffffff',
  bevelShadow: '#808080',
  bevelDark: '#000000',
  titleBar: '#000080',
  titleText: '#ffffff',
  // Text tones
  text: '#000000',
  muted: '#444444',
  // Darkened from #008000 so it reads on the grey face (~5.4:1); 2030.
  success: '#005000',
  error: '#a00000',
  disabled: '#808080',
  disabledShadow: '#ffffff',
  terminalText: '#c0c0c0',
} as const;

/** Testing menu only (src/components/dev/). */
export const devColors = {
  devBanner: '#800000',
  devButton: '#ffff00',
} as const;

/**
 * Font family names, as registered by useFonts in the root layout (the keys of FONT_FILES).
 * Roles point at these, never at a font file directly.
 */
export const fonts = {
  chrome: 'Silkscreen_400Regular',
  message: 'AtkinsonHyperlegible_400Regular',
  messageBold: 'AtkinsonHyperlegible_700Bold',
  messageItalic: 'AtkinsonHyperlegible_400Regular_Italic',
  mono: 'CourierPrime_400Regular',
  terminal: 'VT323_400Regular',
} as const;

const role = (fontSize: number, fontFamily: string, letterSpacingEm = 0) => ({
  fontSize,
  fontFamily,
  letterSpacing: letterSpacingEm * fontSize,
});

/** Silkscreen is tightened by 0.08em (2020). */
const CHROME_SPACING_EM = -0.08;

/** 2020: text roles. */
export const type = {
  title: role(13, fonts.chrome, CHROME_SPACING_EM),
  action: role(13, fonts.chrome, CHROME_SPACING_EM),
  actionLarge: role(15, fonts.chrome, CHROME_SPACING_EM),
  body: role(13, fonts.message),
  label: role(12, fonts.message),
  caption: role(11, fonts.message),
  mono: role(12, fonts.mono),
  terminal: role(20, fonts.terminal),
} as const;

export type TextVariant = keyof typeof type;

/** 2020: text tones. `inverse` is text on the title bar; `terminal` is terminal text. */
export const tones = {
  normal: colors.text,
  muted: colors.muted,
  success: colors.success,
  error: colors.error,
  disabled: colors.disabled,
  inverse: colors.titleText,
  terminal: colors.terminalText,
} as const;

export type TextTone = keyof typeof tones;

/** The engraved look of disabled text: a 1px white shadow down and right. */
export const disabledTextShadow = {
  textShadowColor: colors.disabledShadow,
  textShadowOffset: { width: 1, height: 1 },
  // Android draws no shadow at radius 0, so use the smallest visible blur.
  textShadowRadius: 0.01,
} as const;

/** Text may grow with the system font size, up to this factor. */
export const maxFontSizeMultiplier = 1.5;

export const spacing = {
  xxs: 1,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

export type Spacing = keyof typeof spacing;

/** Bevels are two 1px lines: outer and inner (2000). */
export const borders = {
  line: 1,
} as const;

export const sizes = {
  /** Minimum touch target. */
  touchTarget: 44,
  titleBarHeight: 18,
  titleButtonWidth: 16,
  titleButtonHeight: 14,
  /** The drawn _ ▫ ✕ pictograms on title-bar buttons. */
  titleGlyph: { width: 8, height: 7, stroke: 2, thin: 1, minimizeWidth: 6, crossLength: 9 },
  /** Large button icon above its label. */
  buttonIconGap: 4,
  gif: {
    small: { height: 76 },
    large: { height: 150 },
    half: { height: 76 },
    popup: { width: 180, height: 88 },
  },
  terminalHeight: 400,
  popupWidth: 340,
  /** Dialog (2010): its width, the code/details label column and the drawn error icon. */
  dialogWidth: 300,
  /** A status line under a button (Register): its height stays when it's empty, so nothing jumps. */
  statusLineHeight: 18,
  dialogLabelWidth: 56,
  dialogButtonWidth: 88,
  dialogIcon: { size: 32, border: 1, stroke: 3, crossLength: 16 },
  /** Icon (2010): drawn size; `start` is the taskbar button's. Stroke in viewBox units. */
  icon: { default: 26, start: 16, stroke: 1.4 },
  /**
   * Balloon (2010): 2px outline, corners stepped in by `step` three times, a tail at `tailLeft`
   * from the left. `tail` is the black triangle's side, `tailInset` how much smaller the yellow
   * one inside it is.
   */
  balloon: { outline: 2, step: 2, steps: 3, tailLeft: 28, tail: 18, tailInset: 4 },
  /** Home (1060): how far the main window's big button sits in from each side. */
  homeActionInset: 12,
  /** Taskbar (2010): the strip's height. */
  taskbarHeight: 44,
  /** Testing menu (src/components/dev/): menu button height, so a row's two buttons match. */
  devMenuButtonHeight: 64,
} as const;

/**
 * Stacking order (zIndex, and elevation on Android). The DEV button stays above all of these
 * (src/components/dev/DevButton.tsx).
 */
export const layers = {
  dialog: 100,
} as const;

/** Blink period of the terminal cursor. */
export const motion = {
  cursorBlinkMs: 500,
} as const;

/**
 * Landing result popups: how far each hangs off the right edge (`offsetRight`) and how far
 * it sits from the screen's vertical centre (`shiftY`), from the prototypes.
 */
export const landingPopups = {
  welcome: { offsetRight: 101, shiftY: -122 },
  notWelcome: { offsetRight: 16, shiftY: 57 },
  offline: { offsetRight: 52, shiftY: -60 },
} as const;
