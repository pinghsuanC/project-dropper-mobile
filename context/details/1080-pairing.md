# 1080: Pairing

Accepted, implemented · 2026-11-17 · updated 2026-11-19 (step 2: claim the code, then Home; asking again after a refusal, Open settings, Open camera's width) · Part of [1000 App](1000-app.md)

Pairing connects this phone to the user's PC: the PC shows a QR code (pairing code + server
URL), the phone scans it and claims it on the server (`POST /pairing-request/claim`), which
pairs the two. Step 1 scans, step 2 claims.
Prototypes: `context/prototypes/pairing/`. Components are in [2010](2010-components.md).

## Step 1 (`/pairing/scan`)

Opened from Home – unpaired ("I want to connect to my PC"). Four looks:

| Look | What shows | Prototype |
|---|---|---|
| Step 1 | Balloon "Let's pair!", Window "Pair with your PC — Step 1 of 2": two warning Notices, the prompt, large **Open camera** (camera icon), two muted footnotes. ✕ goes back (Home when opened directly) | `pairing-1-scan.png` |
| Camera note | Info Dialog, title "Camera", heading "Camera access": Continue / Not now (✕ = Not now) | `pairing-1-camera-note.png` |
| Camera | Window "Scan QR code": prompt, live camera with four corner brackets, indeterminate ProgressBar, "Looking for a QR code…", Cancel (✕ = Cancel) | `pairing-flow-02.png` |
| Error | Error Dialog with OK: "Couldn't scan the QR code. Make sure camera access is allowed, then try again." (camera access), or "That isn't a File Dropper pairing code. Scan the QR code on your PC." (a QR that isn't a pairing code) | `pairing-1-error.png` |

The note and the error are popups over step 1; step 1 is hidden from TalkBack while one is
open. Android Back closes the note, the error or the camera, back to step 1.

### Camera permission order

Open camera reads the permission **as it is now** (the hook's `getPermission`, falling back to
the hook's last value), so turning the camera on in Settings and coming back works without
leaving step 1. `cameraStep()` (`lib/cameraAccess.ts`) picks what happens (decided
2026-11-19):

| Permission | Open camera |
|---|---|
| still loading (`null`) | nothing (press again) |
| `granted` | Camera, straight away |
| never asked (`undetermined`) | Camera note; Continue asks Android |
| refused before (`denied`), blocked or not | asks Android straight away, no note (the user has read it) |

Asking Android: granted → Camera; refused → Error ("Couldn't scan…"); refused and blocked
(Android stops asking after the second "Don't allow") → Settings error; the request fails →
Error. A permission that reads as blocked is still asked once: when it really is blocked,
Android answers at once without a prompt, and the reading can be out of date. Found on a phone
on 2026-11-19: with the camera set back to Allow in Settings, the app still read "blocked" in
Expo Go (most likely Expo Go's own per-project record, kept on top of Android's), so only the
request could clear it. Our note always comes before Android's **first** prompt, so the user knows why the
camera is asked for.

**Settings error**: "Camera access is turned off for File Dropper. Turn it on in Settings, then
try again." with **Open settings** (the default button: closes the error and opens this app's
settings page, `Linking.openSettings()`) and **OK** (closes it; ✕ = OK). Once blocked, no app
can show Android's prompt again: only the settings page can turn the camera back on.

### Background

The Pairing Stack (`pairing/_layout.tsx`) gives its screens `contentStyle` with the desktop
colour, like the root and taskbar Stacks: a nested Stack has its own screen containers, which
showed Android's light grey around step 1 and step 2 until 2026-11-19.

### Open camera's width

Open camera has a set width, `sizes.pairingCameraButton` (170, as in the prototype). Left to
size itself in the centred row, the large button with its camera icon stretched down past the
bottom of the screen on Android (Expo Go, RN 0.88, react-native-svg 15.16; found on the
emulator 2026-11-19), pushing the balloon off the top. Without the icon it laid out right;
pinning the icon's size or removing the icon gap did not help. Home's large button, which
stretches to its window's width, never had it. See the Button note in 2010.

### Reading the code

- `QrCamera` (`components/pairing/`): the back camera, `barcodeScannerSettings` QR only,
  in a black square with white corner brackets (`sizes.qrBracket`). Not a `ui/` component:
  only Pairing uses it.
- `useQrScan(onScan)` (`lib/useQrScan.ts`) wraps `onBarcodeScanned`: the camera fires it many
  times a second, so only the **first** QR result with text per mount calls `onScan`.
  Reopening the camera mounts a new `QrCamera`, which reads a new code.
- **The QR format** (decided 2026-11-19, from `API.md`): JSON
  `{ "server_url": "...", "pairing_token": "..." }`. `pairingTokenFrom()` (`lib/pairingQr.ts`)
  returns the `pairing_token`, or null for anything else (not JSON, not an object, no or a
  blank token). `server_url` is ignored: the app only talks to its own server
  (`EXPO_PUBLIC_API_BASE_URL`). The desktop client printed `{ "pairing_code": ... }` at the
  time; the phone doesn't read that key, so the desktop has to print `pairing_token`.
- `onScan`: a pairing code goes into the session's `pairingToken` and step 1 pushes
  `/pairing/wait`; anything else shows the error with the "not a pairing code" message.
- **The code is never a route param**, a log line or on screen. Routes are deep links too: a
  link to `/pairing/wait?token=…` could make the phone claim someone else's PC. It passes
  through the session (memory only), and step 2 takes it out as it starts.

## Step 2 (`/pairing/wait`)

| Look | What shows | Prototype |
|---|---|---|
| Waiting | Balloon "Almost there…" / "Your PC is checking the code. This only takes a moment.", Window "Pair with your PC — Step 2 of 2", "Waiting for the server to respond…", indeterminate ProgressBar | `pairing-flow-03.png` |
| Error | Error Dialog over step 2: "Something went wrong on the server. Please scan the QR code again." with **Back** (✕ = Back) | `pairing-2-error.png` |

- When it opens it reads `pairingToken` once, clears it from the session, and calls
  `claimPairing()` (`api/pairing.ts`) once (a ref keeps a re-run effect from claiming twice).
- **The waiting look stays at least 2 s** (`MIN_PAIRING_WAIT_MS` in `config.ts`, through
  `atLeast()` in `lib/wait.ts`, as Home holds "Checking…"), for success and failure alike: a
  fast claim made step 2 flash by (decided 2026-11-19). A slower claim isn't held longer.
- **Paired**: `pairedWith` = `{ pcName, deviceId }` from `paired_with`, then
  `router.dismissTo('/home')`: back to the Home under Pairing, or Home when there is none.
  That Home checked before pairing and found no PC, so `useConnection` shows "paired" when the
  check said "unpaired" but the session now has a paired PC (no second check, no flash of
  "Checking…"). Upload and Server status read the same hook.
- **Any failure** (404 invalid / expired / used code, 409 this phone or that PC already
  paired, 401, 403, 5xx, no answer): the one message, decided 2026-11-19 (the prototype's).
  Back returns to step 1 (`router.back()`, or step 1 when there's nothing behind), where Open
  camera reads a new code. Android Back does the same through the Pairing stack.
- Opened with no code (e.g. from the testing menu or a link): the error at once, no call.
- No Cancel while waiting yet (Future Features).

Step 1 says the QR code is valid for 3 minutes: the server keeps a pairing request 180 s.

## Setup

- `expo-camera` (in Expo Go). Its config plugin in `app.json` has
  `recordAudioAndroid: false`: the app never records audio. Android's `CAMERA` permission is
  added by the plugin.
- Jest uses the root `__mocks__/expo-camera.tsx`: a View for the camera, and `cameraMock`
  helpers to set the permission, the prompt's answer, and fire a scan. Tests import it
  through `expo-camera` (cast to the mock's type) so they get the same module instance.

## Testing menu

Step 1: `?state=cameraNote | camera | error` sets the first look; the buttons then work as
usual. Step 2: `?state=waiting | error` shows that look and claims nothing; the menu's
"Step 2 - wait" entry opens `waiting`.

## Still open

- Cancel on step 2, unpairing, and telling claim failures apart in the message.
