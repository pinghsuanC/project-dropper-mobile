# 2030: Colour palette

Accepted, implemented · 2026-11-12 (built 2026-11-14; green decided 2026-11-16; icons not yet) · [index](README.md)

One fixed light palette, defined only in `theme.ts` and used **by name**, never by hex.
No dark mode (`app.json`: `userInterfaceStyle: "light"`).

## Surfaces

| Name | Hex | Used for |
|---|---|---|
| `desktop` | `#008080` | Teal background behind all windows |
| `face` | `#c0c0c0` | Windows, buttons, taskbar, status bar |
| `field` | `#ffffff` | Text fields, list boxes |
| `tooltip` | `#ffffe1` | Speech bubble, "Soon to come" tag |
| `terminal` | `#000000` | Terminal, GIF placeholders |

## Bevels and title bars

| Name | Hex | Used for |
|---|---|---|
| `bevelLight` | `#ffffff` | Light edge of a bevel |
| `bevelShadow` | `#808080` | Inner shadow, group-box border |
| `bevelDark` | `#000000` | Dark edge of a bevel |
| `titleBar` | `#000080` | Title bars, selected row, progress blocks |
| `titleText` | `#ffffff` | Text on title bar and selected row |

## Text tones

| Name | Hex | Used for |
|---|---|---|
| `text` | `#000000` | Normal text |
| `muted` | `#444444` | Labels, hints, fine print |
| `success` | `#005000` | Connected, Sent ✓, Registered! |
| `error` | `#a00000` | Errors, Failed, Too large |
| `disabled` | `#808080` + `#ffffff` 1px shadow | Disabled controls (engraved) |
| `terminalText` | `#c0c0c0` | Terminal text |

**Contrast:** `success` is `#005000` (decided 2026-11-16, was `#008000`): ~5.4:1 on `face`
and ~9:1 on white. The old green was ~2.8:1 on `face`, below the 4.5:1 normal text needs. `error` on grey just passes
(~4.6:1). `disabled` is low on purpose; it's always paired with
`accessibilityState.disabled`.

## Icons

| Name | Colours | Used for |
|---|---|---|
| `iconError` | `#ff0000`, outline `#800000`, white ✕ | Error dialog |
| `iconWarning` | `#ffff00`, black outline and ! | Warnings |
| `iconInfo` | `#000080`, outline `#000000`, white i | Info dialog |
| `iconSearch` | lens `#a6caf0`, rim `#000000`, handle `#808080` | Search boxes |

Other icons are one-colour line drawings in the current text colour (so they grey out
with a disabled button). No emoji icons: they look different on every phone.

## As built (2026-11-14)

- `theme.ts` `colors` has every name above, plus `disabledShadow` (`#ffffff`) for the
  disabled tone's shadow. `devColors` is separate.
- `app.json` `userInterfaceStyle: "light"` is set.
- `success` darkened to `#005000` (2026-11-16, Register's "Registered!" on grey).
- `iconWarning` (`#ffff00`) and `iconInfo` (`#000080`) are in `colors` (2026-11-17, Pairing):
  the `warning` and `info` Icons. Still open: `iconError` and `iconSearch`; until then the
  Dialog's drawn error icon uses `error` with a white ✕ (2010).

## Testing menu only

`devBanner` `#800000` (DEV ONLY banner), `devButton` `#ffff00` (DEV button), kept in a
separate `devColors` used only by `src/components/dev/`.

## Plan (with 2020, tests first)

1. Tests: tones resolve to these hexes; Button uses `face` / bevels, `disabled` when disabled.
2. `theme.ts`: `colors` with exactly these names, plus `devColors`.
3. ~~Decide the `success` green~~: `#005000`, 2026-11-16.
4. `app.json`: `userInterfaceStyle: "light"`.
5. `/code-reviewer`: flag hex / `rgb()` outside `theme.ts`.
