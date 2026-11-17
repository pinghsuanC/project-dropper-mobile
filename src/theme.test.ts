// The theme is the only place colours, fonts and sizes are defined (2020, 2030).
import { colors, devColors, fonts, landingPopups, tones, type } from '@/theme';

describe('colors (2030)', () => {
  test('has exactly the 2030 names and hexes', () => {
    expect(colors).toEqual({
      desktop: '#008080',
      face: '#c0c0c0',
      field: '#ffffff',
      tooltip: '#ffffe1',
      terminal: '#000000',
      bevelLight: '#ffffff',
      bevelShadow: '#808080',
      bevelDark: '#000000',
      titleBar: '#000080',
      titleText: '#ffffff',
      text: '#000000',
      muted: '#444444',
      success: '#005000',
      error: '#a00000',
      disabled: '#808080',
      disabledShadow: '#ffffff',
      terminalText: '#c0c0c0',
      iconWarning: '#ffff00',
      iconInfo: '#000080',
    });
  });

  test('dev colours are kept apart from the app palette', () => {
    expect(devColors).toEqual({ devBanner: '#800000', devButton: '#ffff00' });
    expect(Object.keys(colors)).not.toContain('devBanner');
    expect(Object.keys(colors)).not.toContain('devButton');
  });
});

describe('fonts and type roles (2020)', () => {
  test('roles point at the four font names', () => {
    expect(fonts).toEqual({
      chrome: 'Silkscreen_400Regular',
      message: 'AtkinsonHyperlegible_400Regular',
      messageBold: 'AtkinsonHyperlegible_700Bold',
      messageItalic: 'AtkinsonHyperlegible_400Regular_Italic',
      mono: 'CourierPrime_400Regular',
      terminal: 'VT323_400Regular',
    });
  });

  test.each([
    ['title', 13, 'chrome'],
    ['action', 13, 'chrome'],
    ['actionLarge', 15, 'chrome'],
    ['body', 13, 'message'],
    ['label', 12, 'message'],
    ['caption', 11, 'message'],
    ['mono', 12, 'mono'],
    ['terminal', 20, 'terminal'],
  ] as const)('%s is %ipx in the %s font', (role, size, font) => {
    expect(type[role].fontSize).toBe(size);
    expect(type[role].fontFamily).toBe(fonts[font]);
  });

  test('Silkscreen roles have letter spacing of -0.08em; others none', () => {
    for (const role of ['title', 'action', 'actionLarge'] as const) {
      expect(type[role].letterSpacing).toBeCloseTo(-0.08 * type[role].fontSize);
    }
    for (const role of ['body', 'label', 'caption', 'mono', 'terminal'] as const) {
      expect(type[role].letterSpacing).toBe(0);
    }
  });
});

describe('tones (2020)', () => {
  test('each tone is a 2030 colour', () => {
    expect(tones).toEqual({
      normal: colors.text,
      muted: colors.muted,
      success: colors.success,
      error: colors.error,
      disabled: colors.disabled,
      inverse: colors.titleText,
      terminal: colors.terminalText,
    });
  });
});

describe('Landing popups', () => {
  test('each of the three popups has its own offset and vertical shift', () => {
    expect(Object.keys(landingPopups).sort()).toEqual(['notWelcome', 'offline', 'welcome']);
    for (const popup of Object.values(landingPopups)) {
      expect(popup.offsetRight).toBeGreaterThanOrEqual(0);
      expect(typeof popup.shiftY).toBe('number');
    }
  });
});
