# 2010: UI components

Accepted, not implemented · 2026-11-12 · Part of [2000 UI](2000-ui.md)

Every component the screens are built from: layers, folders, props and states.

## Layers

A component may use its own layer or lower, never higher.

```
src/components/
├── ui/
│   ├── primitives/   Bevel, Text
│   ├── controls/     Window, TitleBar, Button, TextField, ListBox, ProgressBar,
│   │                 StatusBar, GroupBox, PropertyRow, Gif, Icon
│   ├── patterns/     Dialog, ConfirmWindow, ResultPopup, PropertySheet, Balloon,
│   │                 Terminal, Taskbar, Notice, FileList
│   └── index.ts      re-exports all of ui/
└── dev/              DevMenu, DevButton (testing menu, see 1020)
```

- One component per file, test next to it (`Button.tsx` + `Button.test.tsx`).
- Screens import from `@/components/ui`; files inside `ui/` import each other by path
  (avoids import loops through the index).
- A piece used on two or more screens becomes a component; one use stays in its screen.

## Primitives

| Component | Owns | Props |
|---|---|---|
| **Bevel** | The 2px edge; everything with an edge uses it | `kind`: `raised` · `sunken` · `field` (sunken, white inside) · `etched` (group box) |
| **Text** | All text | `variant` (role), `tone`, `bold` ([2020](2020-typography.md)) |

## Controls

| Component | Owns | Props / states |
|---|---|---|
| **Window** | Raised face box + `TitleBar` + padded body | `title`, `onClose?`, `onMinimize?`, `onMaximize?` |
| **TitleBar** | Navy bar, title, _ ▫ ✕ | A button is enabled **only if its handler is passed**, otherwise greyed out |
| **Button** | Bevel, press, disabled, icon | `variant`: `default` · `large` (icon above label) · `start` (taskbar). **Pressed:** bevel sinks, content moves 1px via `transform`, padding never changes (no resize). **Disabled:** `disabled` tone + `accessibilityState.disabled`. Touch target ≥ 44×44 |
| **TextField** | Sunken input, label, hint, counter | `label`, `hint?`, `maxLength?` (`n/max`), `filter?` (runs on type and paste, before the length limit), `icon?` |
| **ListBox** | Sunken scrolling list | `items`, `renderRow`, `emptyText`, `selectedId?`, `onSelect?`. Selected row: `titleBar` / `titleText` |
| **ProgressBar** | Navy blocks | `value?` (none = indeterminate), `size`: `default` · `mini` |
| **StatusBar** | Sunken strip, `|`-separated | `segments` |
| **GroupBox** | Etched border, label on the line | `label`, `soon?` (greyed + "Soon to come" tag) |
| **PropertyRow** | Label/value row, **fixed 72px label column** | `label`, `value`, `mono?`, `action?` |
| **Gif** | Image for its slot this session | `slot` (never a URL), `size`: `small` · `large` · `half` · `popup`. Local fallback if the URL fails. `expo-image` ([2040](2040-gifs.md)) |
| **Icon** | All pictograms | `name`: `globe` · `monitor` · `camera` · `folder` · `retry` · `gear` · `error` · `warning` · `info` · `search` ([2030 icons](2030-colors.md#icons)) |

## Patterns

| Component | What it is |
|---|---|
| **Dialog** | Modal popup. `kind`: `error` · `warning` · `info` · `loading` (Gif instead of icon, no buttons, ✕ disabled, closed by the app). `heading` (default "Error"), `message`, optional `code` / `details`, `primary`, optional `secondary`. ✕ = secondary, or primary if alone. Focus on primary; `accessibilityRole="alert"` |
| **ConfirmWindow** | Inline (non-modal) question: prompt, optional note, two buttons |
| **ResultPopup** | Landing result over the terminal: Gif, message, optional button, title-bar buttons disabled; `offset` hangs it off-screen, content centred in the visible part |
| **PropertySheet** | Read-only GroupBoxes. Missing values: **Unknown** (exists, not known) / **N/A** (doesn't exist) |
| **Balloon** | Pale-yellow speech bubble, pixel-stepped corners, tail pointing down. `title`, `text` |
| **Terminal** | DROPPER.EXE black window, blinking cursor. `lines` |
| **Taskbar** | Bottom strip with the Properties "Start" button; lives in the paired routes' layout |
| **Notice** | One-line icon + text (e.g. bold warning) |
| **FileList** | ListBox of files: name cut to 20 chars, size, then a ✕, a `size · date` line, or a status (Sent ✓ · % · Waiting · Failed · Too large) |

### Dialog `code` and `details`

```tsx
<Dialog kind="error" message={strings.register.serverError}
        code={error.status} details={error.detail} primary={{ label: 'OK', onPress }} />
```

- `message` is a plain sentence from `strings.ts`; `code` / `details` show below it in a
  sunken `mono` box, **each row only when given** (neither → no box). The caller decides,
  e.g. hide details on pairing errors.
- Same shape as `ApiError(status, detail)`. `api/client.ts` turns FastAPI's 422 list into
  text first.

## Testing menu

Shown in `local` / `dev`, hidden in `prod` ([1020](1020-environments.md)).
**DevMenu**: `/dev` screen built from a `DEV_ROUTES` list. **DevButton**: floating yellow
button above popups.

## Notes

- `Icon` as SVG needs `react-native-svg` (in Expo Go); PNGs via `expo-image` also work.
- `Balloon` corners and `ResultPopup` offset have no direct RN equivalent: use a 9-slice
  image and `useWindowDimensions()`.

## Plan (one feature per layer, tests first)

1. **Primitives** with `theme.ts` (2020, 2030): Bevel edge colours per kind; Text variants/tones.
2. **Window, TitleBar, Button**: buttons enabled only with handlers; pressing doesn't resize;
   disabled has `accessibilityState` and ignores presses.
3. **Other controls**: TextField filter before limit (paste too), ListBox empty/selection,
   ProgressBar both modes, the rest.
4. **Patterns**: Dialog (1 vs 2 buttons, ✕, focus, code/details rows), ConfirmWindow,
   FileList statuses, PropertySheet Unknown/N/A, then the rest.
5. **Testing menu** behind `SHOW_TESTING_MENU`.
