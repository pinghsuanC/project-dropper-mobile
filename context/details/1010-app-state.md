# 1010: App state and session

Accepted, part 1 implemented, part 2 next · updated 2026-11-14 · Part of [1000 App](1000-app.md)

Two places only: **storage** (survives closing the app) and the **session** (memory, one
global Zustand store, [1030](1030-session-store.md)). Screens never look things up
themselves: they read the session with `useSession(selector)`.

## Lives in storage

Everything is in `expo-secure-store` (an encrypted key-value store on the phone), read and
written only through `lib/storage.ts`. Storage keys are in `config.ts`.

| Item | Written | Notes |
|---|---|---|
| Private key | First launch (Register) | Only read to sign; **never copied into the session**, logged or sent |
| `device_id` | After `POST /auth/register` | Read once at start, copied into the session |
| User name, device name | On Register | Local only, the server doesn't store them. Read once at start, copied into the session |

`getDevice()` returns `{ deviceId, userName, deviceName }`, or `null` when there's no
`device_id`. `saveDevice()` / `clearDevice()` serve Register and unregister. There is
**no** storage function for the session token.

## Lives in session

| Item | Set by | Notes |
|---|---|---|
| `deviceId`, `userName`, `deviceName` | Start-up | Copies of the stored values (`setIdentity`) |
| Session token | Login (challenge → sign → verify) | **Never stored or logged**; every app start logs in again. `api/client.ts` reads it with `getSession()`; screens never pass it |
| `pairedWith` (PC name, or none) | Start-up, and after pairing | Not stored, so it can't go stale. Stays `null` until `GET /devices/paired` exists |
| Daily quote | Start-up | Home bubble. No server route yet: the local default from `assets/quotes.json` |
| GIF picks | Start-up, once | Added with its feature: [2040](2040-gifs.md) |
| Upload queue | Upload screen | Added with its feature. Sent files leave the queue as soon as they're done (they're on the Server page). On leaving `/upload`, failed files are dropped; only in-progress and waiting files are kept. Not kept across app restarts |

## Start-up (what Landing does)

```
getDevice() → session (read once)
 ├─ no device_id ───────────────────────────────────→ Not registered → Register
 └─ device_id
     POST /auth/challenge
     ├─ network error / timeout ───────────────────→ Server unreachable (Retry → start again)
     ├─ 404 → re-register ONCE with the stored key and names, save the new device_id,
     │        retry login; a second 404 or failure ─→ Not registered → Register
     ├─ 403 revoked ────────────────────────────────→ Not registered → Register
     └─ challenge → sign → POST /auth/verify-challenge
         ├─ 401 or 403 ─────────────────────────────→ Not registered → Register
         └─ token → setToken
             ├─ quote: local default; pairedWith: null (no routes yet)
             └─ Welcome back → Home
```

- **Unreachable** = a network error or timeout on `/auth/challenge`. No separate
  `GET /health` call.
- **Re-register** needs the stored user and device names; if either is missing, go to
  Register instead.
- **Popups:** "Welcome back <name>, redirecting.." when a user name is stored, otherwise
  "Welcome back, redirecting.." (two strings, nothing joined). The Welcome and Not
  registered popups stay **2 seconds**, then `router.replace(...)` so Back can't return to
  Landing. The delay is a `config.ts` value.
- The order lives in a pure `lib/startup.ts` that returns an outcome
  (`welcome` · `notRegistered` · `unreachable`); Landing only maps outcome → popup →
  redirect.

## Crypto

- Ed25519 with `@noble/ed25519`, with SHA-512 from `@noble/hashes`. Random bytes for the
  private key come from `expo-crypto` (Hermes has no `crypto.getRandomValues` of its own).
- Rules from CLAUDE.md "Crypto rules": PEM SubjectPublicKeyInfo public key, sign the
  challenge string's UTF-8 bytes exactly, base64 signature, fingerprint = SHA-256 hex of
  the Android ID (`expo-application`).
- Everything in `lib/crypto.ts`.

## Plan (tests first), in two features

**Part 1: foundations, no UI**

1. `npx expo install expo-secure-store expo-application expo-crypto @noble/ed25519 @noble/hashes`.
2. `constants/config.ts` (1020: `APP_ENV`, `API_BASE_URL`, paths, timeout, storage keys,
   redirect delay) and `.env.example`.
3. `lib/storage.ts`: `getDevice`, `saveDevice`, `clearDevice`, private key get/save.
4. `lib/crypto.ts`: key pair, PEM, sign, fingerprint.
5. `api/types.ts`, `api/client.ts` (base URL, envelope, auth header from the session,
   `ApiError`, unreachable error), `api/auth.ts` (challenge, verify, register).

**Part 2: Landing start-up**

6. `lib/startup.ts`: the order above.
7. Landing: popups, Retry, 2-second redirects, strings.
