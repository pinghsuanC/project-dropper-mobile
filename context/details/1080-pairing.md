# 1080: Pairing

Accepted, step 1 implemented · 2026-11-17 · Part of [1000 App](1000-app.md)

Pairing connects this phone to the user's PC: the PC shows a QR code (pairing code + server
URL), the phone scans it and claims it on the server. Step 1 (scan) is built; step 2 (claim
and wait) waits for the server's `/pair/*` routes (🚧 M7 in `API.md`) and a fixed QR format.
Prototypes: `context/prototypes/pairing/`. Components are in [2010](2010-components.md).

## Step 1 (`/pairing/scan`)

Opened from Home – unpaired ("I want to connect to my PC"). Four looks:

| Look | What shows | Prototype |
|---|---|---|
| Step 1 | Balloon "Let's pair!", Window "Pair with your PC — Step 1 of 2": two warning Notices, the prompt, large **Open camera** (camera icon), two muted footnotes. ✕ goes back (Home when opened directly) | `pairing-1-scan.png` |
| Camera note | Info Dialog, title "Camera", heading "Camera access": Continue / Not now (✕ = Not now) | `pairing-1-camera-note.png` |
| Camera | Window "Scan QR code": prompt, live camera with four corner brackets, indeterminate ProgressBar, "Looking for a QR code…", Cancel (✕ = Cancel) | `pairing-flow-02.png` |
| Error | Error Dialog "Couldn't scan the QR code. Make sure camera access is allowed, then try again." with OK | `pairing-1-error.png` |

The note and the error are popups over step 1; step 1 is hidden from TalkBack while one is
open. Android Back closes the note, the error or the camera, back to step 1.

### Camera permission order

Open camera reads `useCameraPermissions()` (`expo-camera`) and picks the look with
`cameraStep()` (`lib/cameraAccess.ts`):

| Permission | Look |
|---|---|
| still loading (`null`) | nothing (press again) |
| `granted` | Camera, straight away |
| not granted, `canAskAgain` | Camera note; Continue asks Android → granted: Camera, denied (or the request fails): Error |
| not granted, can't ask again | Error (only the system settings can change it now) |

Our note always comes before Android's prompt, so the user knows why the camera is asked for.

### Reading the code

- `QrCamera` (`components/pairing/`): the back camera, `barcodeScannerSettings` QR only,
  in a black square with white corner brackets (`sizes.qrBracket`). Not a `ui/` component:
  only Pairing uses it.
- `useQrScan(onScan)` (`lib/useQrScan.ts`) wraps `onBarcodeScanned`: the camera fires it many
  times a second, so only the **first** QR result with text per mount calls `onScan`.
  Reopening the camera mounts a new `QrCamera`, which reads a new code.
- **For now** step 1's `onScan` is `printQrCode`: `console.log` of the text in dev builds
  only (`__DEV__`), then the camera closes back to step 1. The text is a one-time pairing
  code, so release builds never print it, and step 2 replaces the print with the claim.

## Setup

- `expo-camera` (in Expo Go). Its config plugin in `app.json` has
  `recordAudioAndroid: false`: the app never records audio. Android's `CAMERA` permission is
  added by the plugin.
- Jest uses the root `__mocks__/expo-camera.tsx`: a View for the camera, and `cameraMock`
  helpers to set the permission, the prompt's answer, and fire a scan. Tests import it
  through `expo-camera` (cast to the mock's type) so they get the same module instance.

## Testing menu

`?state=cameraNote | camera | error` sets the first look; the buttons then work as usual.

## Still open

- QR payload format (pairing code + server URL), and step 2.
- An "Open settings" button for a permission denied for good.
