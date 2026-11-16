# 1010: App state and session

Accepted, implemented · updated 2026-11-14 · Part of [1000 App](1000-app.md)

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
| User name | On Register | **Local only**: never sent to the server. May be missing (`null`). Read once at start, copied into the session |
| Device name | On Register | Sent to the server as `name` on register (`/auth/me` returns it). Read once at start, copied into the session |

`getDevice()` returns `{ deviceId, userName, deviceName }`, or `null` when there's no
`device_id`. `saveDevice()` / `clearDevice()` serve Register and unregister; deleting just
the `device_id` serves the missing-key case below. There is **no** storage function for the
session token.

`clearDevice()` also deletes the **private key**. Unregister leaves the device's row on the
server as `revoked`, still holding its public key, which must stay unique: registering
again with the same key would get a 409. So Register needs a new key after an unregister
(server `API.md`, `POST /auth/unregister`). The re-register after a 404 is different: the
server has no row for the key, so the same key works, and `saveDeviceId()` keeps it.

## Lives in session

| Item | Set by | Notes |
|---|---|---|
| `deviceId`, `userName`, `deviceName` | Start-up | Copies of the stored values (`setIdentity`); `deviceName` then replaced by `/auth/me`'s `name` |
| Session token | Login (challenge → sign → verify) | **Never stored or logged**; every app start logs in again. `api/client.ts` reads it with `getSession()`; screens never pass it |
| `pairedWith` (PC name, or none) | Start-up, and after pairing | Not stored, so it can't go stale. Stays `null` until `GET /devices/paired` exists |
| Daily quote | Start-up | Home bubble. No server route yet: the local default from `assets/quotes.json` |
| GIF picks | Start-up, once | Added with its feature: [2040](2040-gifs.md) |
| Upload queue | Upload screen | Added with its feature. Sent files leave the queue as soon as they're done (they're on the Server page). On leaving `/upload`, failed files are dropped; only in-progress and waiting files are kept. Not kept across app restarts |

## Start-up (what Landing does)

```
getDevice() → session (read once)
 ├─ no device_id ───────────────────────────────────→ Not registered → Register
 ├─ device_id, no private key → new key pair saved, device_id deleted
 │                                                  → Not registered → Register
 └─ device_id + key
     POST /auth/challenge
     ├─ 404 → re-register ONCE (stored device name, stored key), save the new device_id,
     │        retry login; a second 404 or a 4xx ──→ Not registered → Register
     ├─ any other 4xx (403 revoked, 422, …) ────────→ Not registered → Register
     └─ challenge → sign → POST /auth/verify-challenge
         ├─ any 4xx (401, 403, …) ──────────────────→ Not registered → Register
         └─ token → setToken → GET /auth/me (checks the session)
             ├─ any 4xx ─────────────── clear token → Not registered → Register
             └─ name → session deviceName
                 ├─ quote: local default; pairedWith: null (no routes yet)
                 └─ Welcome back → Home

On any call: network error, timeout, 5xx, or no server URL configured
                                                    → Server unreachable (Retry → start again)
```

- **Unreachable** = no usable answer from the server: a network error, timeout or 5xx on
  any call, or a missing `EXPO_PUBLIC_API_BASE_URL`. A 5xx is "unreachable" because
  registering again can't fix a broken server. No separate `GET /health` call.
- **Re-register** sends the stored device name as `name`; the user name isn't needed (the
  server never gets it). No stored device name → Register instead.
- **Missing private key** with a `device_id`: the old identity can't sign any more, so make
  and save a new key, delete only the `device_id` (names stay), and go to Register.
- **`/auth/me` after login** (also after a re-register's login) confirms the new token
  works before Landing says Welcome, and gives the server's device `name`. That name goes
  into the session only; storage keeps its own copy for re-registering, when there's no
  token to call `/auth/me` with. Later 401 / 403 (24 h expiry, revocation) still surface
  on whichever protected call hits them.
- **Missing user name** is fine everywhere: the session holds `null` (so `setIdentity`
  takes nullable names) and Welcome uses its no-name message.
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
