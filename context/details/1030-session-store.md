# 1030: Session store (Zustand) and routes

Accepted, implemented · 2026-11-13 · Part of [1000 App](1000-app.md) · Replaces the
"React Context is enough" line in [1010](1010-app-state.md)

## Session store

The session from 1010 is **one global Zustand store**, `src/state/session.ts`. No
Provider: any component reads it, and code outside React reads it too.

| Export | Use |
|---|---|
| `useSession(selector)` | In components: `useSession((s) => s.pairedWith)`. Re-renders only when that slice changes |
| `getSession()` | Outside React (e.g. `api/client.ts` reading the token), and to call actions |
| `useSessionStore` | The store itself; only for tests and rare cases |

| Field | Start | Action |
|---|---|---|
| `deviceId`, `userName`, `deviceName` | `null` | `setIdentity({ deviceId, userName, deviceName })`; the names may be `null` (1010) |
| `token` | `null` | `setToken(token \| null)` |
| `pairedWith` | `null` (not paired) | `setPairedWith({ pcName, deviceId } \| null)`; `deviceId` is the upload's `receiver_id` (1090) |
| `quote` | first entry of `assets/quotes.json` | `setQuote(text)` |
| `uploadQueue` | `[]` | `setUploadQueue(list \| (queue) => list)`, `updateQueuedFile(id, change)` (1090) |
| `uploadSending` | `null` (not sending) | `setUploadSending({ current, total } \| null)`; `current` 0 = preparing |
| `uploadOutcome` | `null` | `setUploadOutcome({ kind: 'sent', count } \| { kind: 'failed' } \| null)`: how the last send ended, until its popup closes |
| (all) | | `reset()` back to the start values |

`gifs` (1010) is added with its feature. The upload fields came with Upload Part 2 (2026-11-17).

**Why Zustand over React Context:** `api/client.ts` needs the token outside React, which a
Context can't give without extra plumbing; and with a Context every reader re-renders on
any change, while a Zustand selector only re-renders on its own slice. A global store
(over `createStore` in a Provider) is simpler; tests call `reset()` in `beforeEach`.

**Rules:** nothing is persisted (no `persist` middleware). The token stays in memory
only, as 1010 says; storage goes through `lib/storage.ts`.

**Default quotes:** `assets/quotes.json`, a list of `{ "text": ... }`. The store starts
with the first one; the quote feature can pick another or fetch one.

## Routes

```
src/app/
├── _layout.tsx              root Stack, header hidden, safe area
├── index.tsx                Landing  /
├── register.tsx             /register
├── (taskbar)/               group: not in the URL; layout adds the taskbar
│   ├── _layout.tsx
│   ├── home.tsx             /home
│   ├── server-files.tsx     /server-files
│   └── upload.tsx           /upload
├── pairing/
│   ├── _layout.tsx          Stack: Back from step 2 returns to step 1
│   ├── scan.tsx             /pairing/scan  (step 1)
│   └── wait.tsx             /pairing/wait  (step 2)
├── share.tsx                /share
├── properties.tsx           /properties
└── dev.tsx                  /dev  testing menu (local / dev only, 1020)
```

- Screen states (success, failed, errors, camera note) are states of one route, not
  routes, so Back never steps between states.
- The taskbar is on Home, Server files and Upload only.
- Landing stays the entry route; once start-up is built it moves on with
  `router.replace`, so Back can't return to it.
- **No `index.tsx` in sub-folders (Windows):** Expo's typed-routes generator types
  `pairing\index.tsx` as `/pairing/index` on Windows (it strips `/index` before turning
  `\` into `/`). Routing works, but `href="/pairing"` fails the type check. Name
  sub-folder screens instead (`scan.tsx`).

## Testing notes

- Routes: `renderRouter('./src/app', { initialUrl })` from `expo-router/testing-library`;
  route tests live outside `src/app/` (`src/__tests__/`), or they'd become routes.
- `@testing-library/react-native` 14: `fireEvent.press` and `act` are async; await them
  before checking the path or the render.
- jest-expo maps every `@/…` import to `src/`, so `@/assets/…` doesn't resolve in Jest;
  import assets by relative path.
