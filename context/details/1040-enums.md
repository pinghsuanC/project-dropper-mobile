# 1040: Server enums

Accepted, implemented · 2026-11-14 · Part of [1000 App](1000-app.md)

The server and desktop define their fixed string values as Python `StrEnum`s
(`file-dropper/server/enums.py`). The app keeps a copy in `src/constants/enums.ts`, so code
says `FileStatus.PENDING` instead of `'pending'`.

## Pattern: `as const` object + union type, not `enum`

```ts
export const Platform = { DESKTOP: 'desktop', ANDROID: 'android', IOS: 'ios' } as const;
export type Platform = (typeof Platform)[keyof typeof Platform]; // 'desktop' | 'android' | 'ios'
```

`Platform.ANDROID` is the value, `Platform` is the type (values and types are separate
namespaces in TypeScript, so one name serves both, like a Python `StrEnum`).

Why not TypeScript's `enum`:

- Server JSON is plain strings. A union accepts `'android'` as a `Platform`; a string
  `enum` doesn't, so every API boundary would need a cast.
- Expo compiles each file on its own with Babel, so a `const enum` imported from another
  file can't be inlined.
- `enum` is TypeScript-only runtime syntax (rejected by `erasableSyntaxOnly`); an
  `as const` object is plain JavaScript. The repo already uses this pattern (`API_PATHS`,
  `STORAGE_KEYS`, `APP_ENVS` in `config.ts`).

## Rules

- Values must match `server/enums.py` exactly: a mismatch is a 422. A test pins them.
- Copy every server enum, even ones the app doesn't use yet (`SessionStatus`), so the file
  stays a plain mirror of the server's.
- When the server adds or changes an enum, update `enums.ts` and its test together.
- API types in `api/types.ts` use the union types (e.g. `platform: Platform`).
- `enums.ts` turns off `@typescript-eslint/no-redeclare` for that file only: the rule
  flags a value and a type sharing a name, which TypeScript allows and this pattern needs.
