---
name: ui-reviewer
description: Review this app's screens on a running Android emulator or phone through adb. Takes screenshots and reads the accessibility tree to check the Windows 98 UI rules, layout, and accessibility (labels, roles, touch target sizes, font scaling, aria and accessibility props). Read-only, it never changes code. Use when the user asks to review, check or test the UI, a screen, or accessibility.
argument-hint: "[route ... | --changed]"
---

# UI reviewer

Look at the app's screens the way a user sees them, on Android, and report UI and
accessibility problems by screen.

**This skill doesn't change code.** Never edit, create or delete project files, install
packages or commit. The only output is the report.

Screens: `$ARGUMENTS`

- Empty: every screen in `src/app/` (each file is a route; skip `_layout.tsx`).
- Routes, e.g. `/` or `/send`: only those screens.
- `--changed`: screens in `src/app/` that differ from `main`, plus screens that use a
  component that differs from `main` (`git diff --name-only main` and
  `git ls-files --others --exclude-standard`).

Scripts used below are in this skill's folder, `.claude/skills/ui-reviewer/`.

## Rules for using the device

- Navigation taps (opening a screen, a tab, a menu) are fine.
- Never tap anything that sends, uploads, registers, pairs, deletes or signs in, unless the
  user asked for that flow. Those actions reach the real server.
- Never type real credentials. Use test values only.
- Temporary device settings (font scale, dark mode) are allowed on an **emulator** only, and
  must be restored before finishing, even if a step fails. Never change settings on a
  physical phone.
- Don't uninstall apps, clear app data or wipe the emulator.

## Setup

1. **Device.** Run `adb devices`. Use the first entry in the `device` state. Ignore
   `offline` or `unauthorized` entries: on this PC, a non-Android program on port 5563
   shows up as a fake `emulator-5562`. If no device is ready, ask the user to start the
   emulator (or connect a phone with USB debugging) and stop.
   Record whether it's an emulator (`emulator-*` serial) or a phone.
   **Start every shell command that uses adb with `export ANDROID_SERIAL=<serial>`**
   (shell state doesn't carry over between commands). Without it, the fake entry makes
   every plain `adb` command fail with "more than one device/emulator". In Git Bash, also
   prefix adb commands that take a device path with `MSYS_NO_PATHCONV=1`, or `/sdcard/...`
   gets rewritten into a Windows path.
2. **Metro.** Check `curl -s http://localhost:8081/status` returns `packager-status:running`.
   If not, start `npx expo start --localhost` in the background and remember to stop it at
   the end. Don't stop a Metro server you didn't start.
3. **Port.** `adb reverse tcp:8081 tcp:8081`, so the app reaches Metro through `localhost`
   (the PC's network address is often blocked by the firewall).
4. **Output folder.** Save captures in this session's scratchpad directory if there is one,
   otherwise in `.ui-review/` (gitignored). Use a new subfolder per run.

## Opening a screen

1. Clear the log: `adb logcat -c`.
2. Open the route in Expo Go:
   `adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081/--/<route>"`
   (for `/`, use `exp://127.0.0.1:8081`).
3. Wait until `adb logcat -d -s ReactNativeJS:*` shows `Running "main"`, then about 3
   seconds more for the screen to settle.
4. If Expo Go's developer menu introduction is showing (text "This is the developer menu"),
   tap its **Continue** button, using the bounds from the capture's tree.
5. Capture: `bash .claude/skills/ui-reviewer/capture.sh <out-dir> <screen-name>`.
   Exit 1 means no device; exit 2 means the capture failed. Report either and stop.

## Checks per screen

Look at the screenshot (read the `.png`) and the parsed tree (the `.json`), and read the
screen's source file and the components it uses.

### 0. The capture is trustworthy

- **Frozen display**: if two different screens give the same `SCREENSHOT_MD5`, or the
  screenshot doesn't match the tree's text, the emulator's display is frozen. Stop and tell
  the user to cold-boot the emulator (Device Manager → ⋮ → Cold Boot Now).
- **Errors**: any `ReactNativeJS` error, red error screen, or `AndroidRuntime` crash in the
  `-log.txt` is a finding. A "Cannot connect to Expo CLI" warning means step 3 of Setup
  didn't take; redo it.
- **Wrong app**: the capture's `FOREGROUND` line should be `host.exp.exponent` (Expo Go), and
  the screen should be this project. If it's the launcher or another app, reopen the route
  (step 2 of Opening a screen) and capture again. If it's a different project, another
  Metro server may be running.
- **Expo Go's overlay**: the round gear button with a **Tools** label in the top right
  belongs to Expo Go, not the app. Leave it out of every check.

### 1. UI rules (from `CLAUDE.md`)

- Colors only from `theme.ts`: face `#c0c0c0`, desktop `#008080`, title bar `#000080`.
- Square corners, no shadows, 2px bevels: raised is white top/left and black bottom/right;
  sunken is the reverse with a white inside. Pressed buttons invert their bevel.
- Text 11–13px, pixel-style font.
- Screens built from `Window`, `TitleBar`, `Button`, `TextField`, `ListBox`, `StatusBar`,
  `ProgressBar`.

### 2. Layout

- Text cut off, overlapping, or running off screen.
- Content under the status bar, camera cutout or navigation bar (compare node bounds with
  the screen size; the top ~24dp and bottom ~48dp are system areas).
- Elements misaligned or unevenly spaced compared with their neighbours.
- If `context/prototypes/` has a screenshot of this screen, compare them and list
  differences.

### 3. Accessibility

Start from the `problems` list in the `.json`, then check the rest by hand. Report every
item with the node's text or label, so the user can find it.

1. **Accessible names.** Every tappable element has a name: its text, or `aria-label` /
   `accessibilityLabel` (shown as `label` in the tree). Icon-only buttons and images that
   convey meaning need a label. Decorative images should be hidden with `aria-hidden` or
   `importantForAccessibility="no"`.
2. **Roles.** Tappable elements report as buttons, links, switches or checkboxes, not plain
   `View` / `ViewGroup`. In code, look for `role` / `accessibilityRole` on custom
   `Pressable`s. The window title should have `role="header"`.
3. **States.** Disabled controls set `aria-disabled` / `accessibilityState={{ disabled }}`
   (shown as `enabled: false`); checkboxes, toggles and selected list items expose checked
   or selected. Progress bars expose their value (`aria-valuenow`, `aria-valuemin`,
   `aria-valuemax`, or `accessibilityValue`).
4. **Touch targets.** At least 48×48dp. The small Windows 98 look can draw smaller buttons,
   but `hitSlop` should bring the tap area up to 48dp.
5. **Text fields.** Each `TextField` has a label (visible, or `aria-label`), and errors are
   announced (`aria-live` / `accessibilityLiveRegion="polite"` on the error text).
6. **Contrast.** Text against its background meets 4.5:1 (3:1 for text 18px+ or bold
   14px+). Work it out from the `theme.ts` colors in the code; the Windows 98 grays make
   gray-on-gray text a common failure.
7. **Font scaling** (emulator only). Run
   `adb shell settings put system font_scale 1.3`, reopen the screen with the same
   `am start` command (don't force-stop Expo Go), check `FOREGROUND`, capture it as
   `<screen>-font130`, then restore with `adb shell settings put system font_scale 1.0`.
   Flag clipped or overlapping text, and any `allowFontScaling={false}` or
   `maxFontSizeMultiplier` below 1.3 in the code.
8. **Reading order.** The tree's node order is roughly what TalkBack reads. Flag screens
   where it jumps around (for example, buttons read before the title).
9. **Code-only checks** in the screen and its components: `accessible={false}` on something
   tappable, `aria-hidden` on content that matters, `aria-*` props with values that don't
   match what's shown, and touchables with no accessibility props at all.

## Finishing

Before reporting, always:
- Restore any device setting you changed (font scale back to `1.0`).
- Stop Metro if you started it.
- Leave the app open, so the user can look.

## Report

1. **Summary**: device used, screens reviewed, number of findings by severity.
2. **One section per screen**: the screenshot path, then a table with columns: Issue,
   Where (node text or label, and `file:line` when found in code), Rule, Severity, Fix.
   Severity is **must fix** (crash, unusable, missing accessible name on a control,
   contrast failure), **should fix**, or **minor**. If a screen has no findings, write
   "No issues found."
3. **Skipped**: screens or checks that couldn't run, and why (for example, font scaling on
   a physical phone).

End the report there. Don't offer to fix the issues, and don't start fixing.
