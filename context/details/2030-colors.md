# 2030: Colour palette

Accepted, not implemented · 2026-11-12 · [index](README.md)

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
| `success` | `#008000` | Connected, Sent ✓ |
| `error` | `#a00000` | Errors, Failed, Too large |
| `disabled` | `#808080` + `#ffffff` 1px shadow | Disabled controls (engraved) |
| `terminalText` | `#c0c0c0` | Terminal text |

**Contrast:** `success` on `face` is ~2.8:1, below the 4.5:1 normal text needs. Use it on
white only (~5.1:1), or darken it to ~`#005000` on grey. `error` on grey just passes
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

## Testing menu only

`devBanner` `#800000` (DEV ONLY banner), `devButton` `#ffff00` (DEV button), kept in a
separate `devColors` used only by `src/components/dev/`.

## Plan (with 2020, tests first)

1. Tests: tones resolve to these hexes; Button uses `face` / bevels, `disabled` when disabled.
2. `theme.ts`: `colors` with exactly these names, plus `devColors`.
3. Decide the `success` green, update this file.
4. `app.json`: `userInterfaceStyle: "light"`.
5. `/code-reviewer`: flag hex / `rgb()` outside `theme.ts`.
