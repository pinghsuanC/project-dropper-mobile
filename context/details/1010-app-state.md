# 1010: App state and session

Accepted, not implemented · 2026-11-12 · Part of [1000 App](1000-app.md)

Two places only: **storage** (survives closing the app) and the **session** (memory, one
object every screen reads via `useSession()`). Screens never look things up themselves.

## Lives in storage

| Item | Where | Written | Notes |
|---|---|---|---|
| Private key | `expo-secure-store` | First launch | Only read to sign; **never copied into the session**, logged or sent |
| `device_id` | `expo-secure-store` | After `POST /auth/register` | Read once at start, copied into the session |
| User name, device name | Device storage | On Register | Read once at start, copied into the session; local only |

## Lives in session

| Item | Set by | Notes |
|---|---|---|
| `device_id`, user name, device name | Start-up | Copies of the stored values |
| Session token | Login (challenge → sign → verify) | **Never stored or logged**; every app start logs in again |
| `pairedWith` (PC name, or none) | Start-up, and after pairing | Not stored, so it can't go stale |
| Daily quote | Start-up, fetched once | Home bubble; built-in default if the request fails |
| GIF picks | Start-up, once | How they work: [2040](2040-gifs.md) |
| Upload queue | Upload screen | Sent files leave the queue as soon as they're done (they're on the Server page). On leaving `/upload`, failed files are dropped; only in-progress and waiting files are kept. Not kept across app restarts |

## Start-up (what Landing does)

```
read device_id, names from storage → session
 ├─ no device_id ──────────────────────────────→ Landing – failed → Register
 └─ device_id
     ├─ server unreachable ────────────────────→ Landing – server unreachable (Retry)
     ├─ login fails (401, or 404 after one re-register) → Landing – failed → Register
     └─ login OK → token
         ├─ GIFs, daily quote (server, or local fallback)
         ├─ pairedWith
         └─ Landing – success → Home (paired / unpaired)
```

```ts
type Session = {
  deviceId: string | null;
  userName: string | null;
  deviceName: string | null;
  token: string | null;                     // memory only
  pairedWith: { pcName: string } | null;    // null = not paired
  quote: { text: string };
  gifs: Record<GifSlot, GifSource>;
  uploadQueue: QueuedFile[];
};
```

~~A React Context is enough; switch to a small store (e.g. Zustand) only if re-renders hurt.~~
**Replaced by [1030](1030-session-store.md):** the session is a global Zustand store.
`api/client.ts` reads the token from the session; screens never pass it.

## First Landing flow (decided 2026-11-13, not built yet)

A first step towards the start-up order above, before login exists:

- The device record (`device_id`, user name, device name) is in `expo-secure-store`, read
  only through `lib/storage.ts`: `getDevice()` returns the values, or `null` when there's no
  `device_id`; `saveDevice()` / `clearDevice()` for Register and unregister. Storage keys in
  `config.ts`.
- No `device_id` → "Not registered" popup → `router.replace('/register')`.
- `device_id` found → identity into the session → "Welcome back" popup →
  `router.replace('/home')`. **No server call yet** (no `/health`, no login).
- Welcome message: "Welcome back <name>, redirecting.." only when a name is stored;
  otherwise "Welcome back, redirecting..", with no name joined on.
- Redirect delay: **1 second**, in `config.ts`.
- Still open: a dev-only way to save a test device ID, to see "Welcome back" on the phone
  before Register exists.

## Plan (tests first)

1. Tests: `device_id` read once; token never written to storage; picks stable on re-read.
2. `lib/storage.ts`: `device_id` and names.
3. `src/state/session.tsx`: `SessionProvider` + `useSession()` in `_layout.tsx`.
4. Landing runs the start-up order.
5. `api/client.ts` reads the token from the session.
