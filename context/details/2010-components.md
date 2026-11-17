# 2010: UI components

Accepted, partly implemented · 2026-11-12 (first components 2026-11-14, TextField and Dialog 2026-11-15, Home's components 2026-11-16) · Part of [2000 UI](2000-ui.md)

**Built:** `Bevel`, `Text`, `TitleBar`, `Window`, `Button`, `Gif`, `Terminal`, `ResultPopup`
(2026-11-14), `TextField`, `Dialog` (`error` kind only, 2026-11-15), `Icon`, `Balloon`,
`ConfirmWindow`, `Taskbar` (2026-11-16), exported from
`src/components/ui/index.ts`; `DevMenu`, `DevButton` in `src/components/dev/` (2026-11-14).
The rest are still to build.

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

As built (2026-11-14), details in [1020](1020-environments.md#as-built-2026-11-14):

- **DevMenu**: `ScrollView` on the desktop teal; maroon `devBanner` strip with "DEV ONLY";
  one `Window` per section (title-bar buttons all disabled); `Button`s two per row in equal
  `flex: 1` cells, an odd last one alone on its row and full width; `minHeight:
  sizes.devMenuButtonHeight` so a row's two buttons match; footer caption.
- **DevButton**: `onPress` prop (the root layout passes the history reset). A `Pressable`
  of at least `sizes.touchTarget` square, absolutely placed bottom-right (offset
  `spacing.md` plus the safe-area insets, since absolute positioning ignores the root
  `SafeAreaView`'s padding and would sit under Android's gesture bar), with a raised
  `Bevel` filled `devButton` yellow in its corner, so the touch area is 44px while the face
  stays small. `zIndex` and `elevation` keep it above screens and popups (Android orders by
  `elevation`).
- `devColors` are used only in `src/components/dev/`; the dev components reuse `Window`,
  `Button`, `Bevel` and `Text` from `ui/` and add nothing to it.

## As built (2026-11-14)

Props added while building, beyond the tables above:

- **Bevel**: `style` (outer box: size, position), `innerStyle` (padding, layout inside the
  edge), `fill` (overrides the kind's colour, e.g. black for a terminal). Two 1px
  lines: raised = light/dark outer, light/shadow inner; sunken and field = the reverse;
  etched = shadow/light outer, light/shadow inner.
- **Text**: `align`; other `Text` props pass through (e.g. `numberOfLines`,
  `accessibilityRole`). No `style` prop, so screens can't set size or colour.
- **Window**: `style` (size, position), `bodyStyle` (body padding/layout).
- **TitleBar**: buttons get a `hitSlop` so their touch area reaches 44px. The _ ▫ ✕
  pictograms are **drawn with views**, not typed: Atkinson Hyperlegible has no □ or ✕, so
  Android would use a fallback font. Sizes are `sizes.titleGlyph` in `theme.ts`; disabled
  glyphs are grey with a white copy 1px down-right (the engraved look).
- **Button**: `icon` (any node, until `Icon` exists), `style` (e.g. a fixed width). Pressed
  state is tracked with `onPressIn` / `onPressOut`.
- **Gif**: shows the slot's local file from `assets/gifs/` (`lib/gifs.ts` `localGif()`)
  straight on the screen, no frame or background (2026-11-16); a slot with no file keeps its
  size, empty. Wrapped in a view hidden from screen readers
  (decorative); tests query it with `includeHiddenElements: true`.
- **Terminal**: `lines`, `style`. Cursor blink period `motion.cursorBlinkMs` in `theme.ts`.
- **ResultPopup**: `title`, `slot`, `message`, `button?: { label, onPress }`, `offset?`,
  `style`. Positioned absolutely; `offset` sets `right: -offset` and pads the body's right
  side by the same amount. Landing's per-popup values are `landingPopups` in `theme.ts`
  (`offsetRight`, `shiftY` from the screen's vertical centre).
- **Fonts**: `src/components/ui/fonts.ts` maps family names to font files; the root layout
  loads it with `useFonts`.

## As built (2026-11-17, Server files)

- **ListBox** (controls): `items`, `keyOf`, `renderRow`, `emptyText`. A `field` Bevel of
  fixed height `sizes.listBoxHeight` (190) around a ScrollView (`nestedScrollEnabled`, so it
  scrolls inside a scrolling screen). `accessibilityRole="list"`, not `accessible`, so each
  row stays its own screen-reader stop. `emptyText` also carries "Loading…" and error lines.
  `selectedId` / `onSelect` from the table above come when something needs selection.
- **FileList** (patterns), server variant: `files: FileRow[]` (`{ id, name, size, createdAt,
  status? }`, its own shape: screens map server types to it; `status` is text from
  `strings.ts`), `emptyText`, `now`. Row: name (`trimName`) over a muted caption "size ·
  type · Uploaded when · status" (`strings.format.fileDetail`; type from the name's
  extension via `fileType`; type and status left out when missing). Each row is one accessible stop labelled with the full name and the detail.
  Upload's variants (✕, Sent ✓, %, Waiting, Failed, Too large) come with Upload.
- **TextField**: `icon?` (drawn inside the field, before the text) and `labelHidden?` (no
  visible label; `label` is still the accessibility label), for search fields.
- **Icon**: `search` (a magnifier: circle and handle, 24-unit outline).

## As built (2026-11-16, Home)

- **Icon** (controls): `react-native-svg` (in Expo Go; installed with `expo install`).
  `name`: `monitor` · `globe` · `retry` · `gear` (the others in the table come later),
  `size`: `default` (`sizes.icon.default`, 26) · `start` (16, the taskbar button), `tone`
  (any text tone; the SVG draws in `currentColor`). Shapes are the prototype's: outline icons
  in a 24-unit box with `sizes.icon.stroke`, the gear a filled 16-unit pixel shape whose hole
  is `face`. Hidden from screen readers (the button's label says it all).
- **Balloon** (patterns): `title` (bold), optional `label` (caption, muted, bold), `text`
  (label role, **italic**). One SVG behind the text, sized from the text's `onLayout`: a
  black stepped outline and a `tooltip` inside (`steppedOutline(w, h, inset)`, corners
  stepped in by 2px three times, as the prototype's clip-path), and a two-triangle tail at
  `sizes.balloon.tailLeft` that opens the body's bottom edge. Draws nothing until measured.
  `accessible` with `accessibilityRole="text"`, so TalkBack reads it as one text item.
  A layout at the same size keeps the old size object, so it doesn't redraw on every pass.
- **ConfirmWindow** (patterns): `title`, `prompt`, `primary` / `secondary`
  (`{ label, onPress, disabled? }`). All title-bar buttons disabled: it can't be closed;
  the screen decides when it shows. Buttons `minWidth: sizes.dialogButtonWidth`.
- **Button** `start`: the touchable (Pressable) is `alignSelf: 'flex-start'` too, not only
  the face, or its touch area spans the whole taskbar.
- **Taskbar** (patterns): `onProperties`. A `face` strip, 2px `bevelLight` top edge,
  `minHeight: sizes.taskbarHeight`, with a `start` Button (gear icon, "Properties"). In
  normal layout at the bottom of the `(taskbar)` layout; the root `SafeAreaView` keeps it
  above Android's gesture bar.
- **Text**: `italic` uses Atkinson Hyperlegible's real italic file (`fonts.messageItalic`),
  message font only; with `bold` too, bold wins (no bold italic is loaded).

## As built (2026-11-15)

- **Button**: `ref` (React 19 ref-as-prop, typed `Ref<ComponentRef<typeof View>>`) on the
  `Pressable`, so Dialog can move screen-reader focus to it.
- **TextField**: controlled: `label`, `value`, `onChangeText`, `placeholder?`, `hint?`,
  `maxLength?`, `filter?`, `editable?` (default true), `testID?`. Every change runs `filter`,
  then cuts to `maxLength`. The native `maxLength` prop is **not** set: it would cut a paste
  before the filter could drop characters. Length counts characters (`Array.from`), not
  UTF-16 units. Input text is `body`; `editable={false}` uses the `disabled` tone; the
  placeholder is `muted`. Hint (`caption`, muted) left and counter right; the counter's
  screen-reader label is `strings.ui.textField.countLabel` ("4 of 20 characters"), and the
  input's `accessibilityHint` is the hint.
- **Dialog**: `kind` (`'error'` only), `heading?` (default `strings.ui.dialog.error`; also the
  title-bar text), `message`, `code?: string | number`, `details?: string`, `primary`,
  `secondary?`, `testID?`. A full-screen absolute overlay (no dimming, no RN `Modal`, which
  would be its own native window above the DEV button) on `layers.dialog` (`theme.ts`, below
  the DEV button's 1000). The window sits in a view with `accessibilityRole="alert"`.
  Focus: `AccessibilityInfo.sendAccessibilityEvent(ref, 'focus')` on the primary button
  (`setAccessibilityFocus` is deprecated). The error icon is drawn with views (an `error`
  red disc, black 1px edge, white ✕), sizes `sizes.dialogIcon`, until `Icon` exists. A 422
  `detail` list must be turned into text by the caller before it goes in `details`.
- **Dialog and screen readers:** the window view has `accessibilityViewIsModal` (iOS only).
  On Android the overlay blocks touches but TalkBack can still reach the screen behind, so
  **a screen showing a Dialog sets `importantForAccessibility="no-hide-descendants"` on its
  own content** while it's open, and handles Android's Back button (`BackHandler`) itself.

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
