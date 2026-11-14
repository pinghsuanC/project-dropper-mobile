# 2020: Typography

Accepted, implemented · 2026-11-12 (fonts picked 2026-11-13, built 2026-11-14) · [index](README.md)

Text is styled by **role** (what it's for), never per screen. Colour is a separate
**tone** that combines with any role.

## Roles

| Role | Used for | Size | Weight | Font |
|---|---|---|---|---|
| `title` | Window title bars | 13 | regular | **Silkscreen** |
| `action` | Button labels, taskbar (`actionLarge` = 15 for big buttons) | 13 | regular | **Silkscreen** |
| `body` | Prompts, messages, file names, date; popup heading and bubble greeting in **bold** | 13 | regular | **Atkinson Hyperlegible** |
| `label` | Field/property/group labels, status bar, list size and date | 12 | regular | **Atkinson Hyperlegible** |
| `caption` | Fine print, hints, counters | 11 | regular | **Atkinson Hyperlegible** |
| `mono` | Technical values: device ID, server address, checksums | 12 | regular | Courier Prime |
| `terminal` | DROPPER.EXE terminal | 20 | regular | VT323 |

**Tones:** `normal` · `muted` · `success` · `error` · `disabled` · `inverse` (white, on the
title bar) · `terminal` (terminal text), added 2026-11-14 (colours in
[2030](2030-colors.md#text-tones)). E.g. an error message is `body` + `error`.

## Fonts (all SIL OFL 1.1, free to bundle)

1. **Silkscreen**: `title` and `action` only ("chrome": title bars and buttons). Letter
   spacing **−0.08em** (scales with size). It draws only capital letters; the text itself
   stays mixed case. Never use it for data (names, files, IDs): case must stay visible.
   No italics.
2. **Atkinson Hyperlegible**: `body`, `label`, `caption` (the "message font"). Clearest
   look-alikes (`I`/`l`/`1`, `O`/`0`), real italic + bold. Picked for now; to switch, change
   `fonts.message` in `theme.ts` and the font package. Runners-up from the trial:
   **IBM Plex Sans** (more "old computer", narrower) and **Inter** (more modern).
3. **Courier Prime**: `mono` only.
4. **VT323**: `terminal` only.

Rejected as the main font: Pixelify Sans (fake italics blur), Silkscreen everywhere (all
caps, too wide for messages), DotGothic16.

**Chinese / Japanese:** none of the fonts above have CJK characters; Android falls back to
its system CJK font (looked fine in the trial). Optional later: a pixel CJK fallback for
Silkscreen (Cubic 11 / 俐方體11號, or Fusion Pixel Font) and Noto Sans TC for messages.
CJK fonts are 5–20 MB each, so only if Chinese UI or names are common.

Ship each font's licence (the `@expo-google-fonts` packages include it); credit them
under About in Properties later.

## As built (2026-11-14)

- `theme.ts` `fonts`: `chrome`, `message`, `messageBold` (Atkinson Hyperlegible 700, used by
  `bold`; Android doesn't fake bold for custom fonts), `mono`, `terminal`. Values are the
  family names registered by `useFonts` (e.g. `Silkscreen_400Regular`).
- `bold` only changes the message font (body, label, caption); Silkscreen has no bold.
- `maxFontSizeMultiplier` = 1.5 on all text.
- `disabled` shadow: 1px down/right, white, radius 0.01 (Android draws nothing at 0).
- If a font fails to load, the app carries on with system fonts instead of hanging on the
  splash screen.

## Rules

- Screens never set `fontSize`, `fontFamily` or text colour: `<Text variant tone>`.
- Names (user, device, PC, file) are `body` / `label`; technical values are `mono`.
- At most two sizes in one window.

## Plan (tests first)

1. `npx expo install expo-font @expo-google-fonts/silkscreen
   @expo-google-fonts/atkinson-hyperlegible @expo-google-fonts/courier-prime @expo-google-fonts/vt323`.
2. `theme.ts` `fonts`: `chrome` = Silkscreen, `message` = Atkinson Hyperlegible, `mono`,
   `terminal`. Roles point at these names, never at a font directly.
3. Tests: each variant's size/weight/font, Silkscreen letter spacing, each tone's colour,
   `disabled` shadow.
4. `theme.ts`: `type` (roles + `actionLarge`, letter spacing per role), `tones`.
5. `Text`: `variant` (default `body`), `tone` (default `normal`), `bold`,
   `maxFontSizeMultiplier`.
6. Load fonts in `_layout.tsx` with `useFonts`, splash screen up until ready.
7. `/code-reviewer`: flag `fontSize` / `fontFamily` / text colour outside `theme.ts`.
