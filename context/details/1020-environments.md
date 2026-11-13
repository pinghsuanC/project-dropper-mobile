# 1020: Environments and the testing menu

Accepted, not implemented · 2026-11-12 · Part of [1000 App](1000-app.md)

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

## Plan (tests first)

1. Tests: missing/unknown `APP_ENV` → `prod`, menu hidden; `local`/`dev` → shown;
   missing `API_BASE_URL` throws.
2. `config.ts` as above; `.env` + committed `.env.example`.
3. `eas.json`: both variables per profile, once EAS builds start.
4. `DevMenu` route and `DevButton` in the root layout, behind `SHOW_TESTING_MENU`.
