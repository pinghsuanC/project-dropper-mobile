# Project Dropper Mobile

The Android app for Project Dropper.

## Tech

- **[Expo](https://expo.dev)** (SDK 58): React Native framework, with Expo Router for navigation
- **[TypeScript](https://www.typescriptlang.org)**
- **[Claude](https://claude.com/claude-code)**: built with Claude Code

## Run

```bash
npm install
npx expo start
```

## Prototype

The clickable HTML prototype is `context/prototypes/temp/index.html`. Serve it with
`python -m http.server 5500 --directory context/prototypes/temp` (or the `prototype`
entry in `.claude/launch.json`) and open `http://localhost:5500`. The yellow DEV button
opens a menu of every screen.

Screenshots live next to it, one folder per DEV-menu category (`landing/`, `register/`,
`home/`, …), each file prefixed with its category. Timed flows are saved as numbered
frames (`register-submit-01.png`, `-02`, …).

# Project Overview
1. Project + connection

Server URL in config: your PC’s LAN IP, e.g. http://192.168.x.x:8000. Run uvicorn with --host 0.0.0.0 so the phone can reach it (by default it only listens to your own PC)
First win: the phone calls GET /health and shows “ok”

2. Device identity

Key: generate an Ed25519 key pair once, and store the private key in expo-secure-store. For signing in JS, @noble/ed25519 is the common choice (check its README for the one-time hash setup it needs in React Native)
Fingerprint: expo-application’s Android ID → SHA-256 → sent as fingerprint
Public key format: your server expects a PEM (SubjectPublicKeyInfo). Noble gives raw 32-byte keys, so the app has to wrap it as PEM. This is the most likely snag, so test it against /auth/register early

3. Register + login

/auth/register (platform: "android") → save device_id
challenge → sign challenge as UTF-8 bytes → /auth/verify_challenge → token
/auth/me shows “Logged in as Pixel …”

4. Send a file

Pick it with expo-document-picker (it gives name, size, mimeType)
Checksum: SHA-256 of the file’s bytes. In JS this is trickier than in Python for big files, so start with small test files
prepare-upload → PUT to upload_url (expo-file-system’s uploadAsync with httpMethod: "PUT" and binary upload) → finish-upload
Done when the desktop’s test_download receives a file sent from the phone. 🎉

## Future features

Listed under `# Future Features` in `context/tracker/current-feature.md`.

## Open decisions (next session)

Not decided yet. Details for each live in `context/details/` where noted.

### Do first
- **Rename `context/requriements/` → `context/requirements/`** (CLAUDE.md uses the correct
  spelling), then write a short requirements file per feature from the prototype.

### API contract (new `context/details/3000-api.md`)
- Routes the app needs that the server doesn't have yet: `GET /health`, pairing claim,
  "paired with?", list server files, `GET /gifs`, `GET /quote`.
- Which routes start-up **requires** (health, login, paired with) vs. treats as optional
  (GIFs, quote).
- GIFs before login: local only, or a GIF route that needs no token?
- Upload size limit (100 MB in the prototype is a placeholder) and where the app gets it.
- Timeouts: the Sharing "loading" check (10–15 s suggested) and normal requests.
- How the client turns FastAPI's 422 `detail` list into readable text for the error popup.
- User name: keep it on the phone only, or add a field on the server?

### UI
- GIFs: final slots and the **Address** column in `2040-gifs.md`.
- `success` green on grey fails contrast (~2.8:1): darken it or only use it on white
  (`2030-colors.md`).
- Popup headings per error: only Shared file ("Process Aborted") and Upload success
  ("Upload complete") are decided; the rest say "Error".
- Optional pixel Chinese font (Cubic 11 / Fusion Pixel) or keep the system fallback
  (`2020-typography.md`).
- Check the screens at a narrow phone width (~360 px); the Upload button row is the tightest.
- App icon, splash screen, and the name shown in Android's Share menu.

### Setup
- Create `.env.example` and set `EXPO_PUBLIC_APP_ENV` / `EXPO_PUBLIC_API_BASE_URL` per
  `eas.json` profile (`1020-environments.md`).
- When to switch from Expo Go to a dev build (needed for Sharing).
