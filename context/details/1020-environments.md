# 1020: Environments and the testing menu

Accepted, implemented · 2026-11-12 (testing menu built 2026-11-14) · Part of [1000 App](1000-app.md)

The dev menu is useful for real-life testing, so it follows a named environment instead
of `__DEV__` (which hides it in every installed build).

## Variables

Both need the `EXPO_PUBLIC_` prefix to reach the app, are public (readable from the APK),
and are read **only** in `src/constants/config.ts`. Set them in `.env` locally and in each
`eas.json` profile's `env` block; `.env*` stay gitignored, with a committed `.env.example`.

| Variable | Meaning | Example |
|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | Which environment this build is | `local` · `dev` · `prod` |
| `EXPO_PUBLIC_API_BASE_URL` | Server address | `http://192.168.1.20:8000` |

| `APP_ENV` | Used for | Server | Testing menu |
|---|---|---|---|
| `local` | Your phone + `npx expo start` | Your PC on the LAN | Shown |
| `dev` | Builds for real-life testing | Dev server | Shown |
| `prod` | Release builds | Production server | **Hidden** |

```ts
// src/constants/config.ts
const ENVS = ['local', 'dev', 'prod'] as const;
const raw = process.env.EXPO_PUBLIC_APP_ENV;
export const APP_ENV = ENVS.includes(raw as never) ? raw : 'prod';  // missing/unknown → prod
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;   // missing → start-up error
export const SHOW_TESTING_MENU = APP_ENV !== 'prod';
```

## Testing menu (`DevMenu`, `DevButton`, see [2010](2010-components.md))

- **Only navigates:** never skips sign-in, never shows secrets (key, token, presigned
  URLs), never changes server data. That's what makes it safe in tester builds.
- **Not security:** hiding it in `prod` keeps the app clean; it protects nothing.
- Visually distinct: DEV banner, yellow button (`devColors`, [2030](2030-colors.md)).

## As built (2026-11-14)

- **Route** `src/app/dev.tsx`: `<Redirect href="/" />` when `SHOW_TESTING_MENU` is false,
  otherwise `DevMenu`. Every file in `src/app/` is a route, so `/dev` exists in prod too;
  it just leads to Landing.
- **Entries** are `DEV_ROUTES` in `src/components/dev/devRoutes.ts`, in the prototype's
  sections and order. An entry for a screen state passes a `state` search param with a
  camelCase value, e.g. `{ pathname: '/register', params: { state: 'serverError' } }`.
  Screens ignore it until they're built; a screen that reads it must check it against its
  own list of states and ignore anything else.
- **Landing has one entry and no states:** it always runs the real start-up from the menu.
  Its Success / Failed / Server unreachable come from the real server (the prototype's
  three extra Landing buttons were dropped).
- **Entries `push`**, so Back returns to the menu.
- **The DEV button clears the history:** it resets the root Stack to `/dev` alone (also
  from nested stacks like `pairing/`), so Back from the menu doesn't return to where the
  tester was; on Android it leaves the app. `router.dismissAll()` only clears the closest
  stack, so the root layout dispatches a `RESET` at its Stack. In this Expo Router version
  a `RESET` needs the complete state (`key`, `routeNames`, `stale: false`, …): the layout
  copies the Stack's own state and swaps its routes.
- **DEV button hidden on `/dev`** (the root layout checks `usePathname()`).
- Tests mock `SHOW_TESTING_MENU` with a getter added by `Object.defineProperty`: an object
  spread would copy the getter's value once, when the mock is made.

## Plan (tests first)

1. Tests: missing/unknown `APP_ENV` → `prod`, menu hidden; `local`/`dev` → shown;
   missing `API_BASE_URL` throws.
2. `config.ts` as above; `.env` + committed `.env.example`.
3. `eas.json`: both variables per profile, once EAS builds start.
4. ✅ `DevMenu` route and `DevButton` in the root layout, behind `SHOW_TESTING_MENU`.
