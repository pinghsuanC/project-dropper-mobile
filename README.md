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
