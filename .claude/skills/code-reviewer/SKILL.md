---
name: code-reviewer
description: Report exposed secrets and environment variables, unused code, constants and config values that aren't in src/constants/, user-facing text that isn't in src/constants/strings.ts, and components that could be refactored. Read-only, it never changes code. Use when the user runs /code-reviewer, or asks for a cleanup, code quality or secrets review of this app's code.
argument-hint: "[path | --changed]"
---

# Code reviewer

Find code that should be removed, moved or refactored, and report it by category.

**This skill is read-only.** Never edit, create, move or delete files, install packages or
commit. The only output is the report. If the user wants fixes, they ask for them
separately after reading it.

Scope: `$ARGUMENTS`

- Empty: everything under `src/`.
- A path: only that file or folder.
- `--changed`: only files that differ from `main`: `git diff --name-only main` plus new
  files from `git ls-files --others --exclude-standard`.

Only look at `.ts` and `.tsx` files in scope. Skip `node_modules/`, `.expo/`, `coverage/`,
generated files (`expo-env.d.ts`, `.expo/types/`) and test files (`*-test.ts(x)`,
`*.test.ts(x)`, `__tests__/`). Tests may use inline values and text freely.

## Where things belong

| What | Where |
|---|---|
| User-facing text | `src/constants/strings.ts` |
| Config: server paths, timeouts, size limits, retry counts, storage keys, feature flags | `src/constants/config.ts` |
| Reading `process.env.EXPO_PUBLIC_*` | `src/constants/config.ts` only, exported as named constants |
| Colors, spacing, font sizes, border widths | `theme.ts` (see the UI rules in `CLAUDE.md`), not `src/constants/` |

If a file in that table doesn't exist yet, say in the report that it should be created.

## Checks

Run all five. Record every finding with `file:line`, what it is, and the suggested fix.

### 0. Exposed secrets and environment variables

This check also covers files outside the scope: `.env*`, `app.json`, `app.config.*`,
`eas.json` and `.gitignore`, because that's where secrets usually leak from.

**Never print a secret's value**, in the report or in a command's output. Refer to it by
variable name and `file:line`, and mask values as `abc…` (first 3 characters) at most.
To check `.env*` files, look only at variable names, e.g.
`grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' .env*`.

Look for:

1. **Secrets in public variables.** Expo builds every `EXPO_PUBLIC_*` variable into the
   app, where anyone with the APK can read it. Flag `EXPO_PUBLIC_*` names that suggest a
   secret: `SECRET`, `PRIVATE`, `PASSWORD`, `TOKEN`, `CREDENTIAL`, `KEY` (except a key
   meant to be public, which the report should say to confirm), R2 or S3 access keys,
   database URLs. Secrets belong on the server, not in the app.
2. **Non-public variables read in app code.** `process.env.X` without the `EXPO_PUBLIC_`
   prefix is `undefined` in the app at runtime, and usually means a server secret is
   expected in the client.
3. **Env files committed to Git.** `git ls-files '.env*'` should list nothing except an
   example file (`.env.example`) with empty or placeholder values. Check that
   `.gitignore` covers `.env*`.
4. **Hard-coded secrets in code or config**: API keys, bearer tokens, passwords, private
   keys (`-----BEGIN ... PRIVATE KEY-----`), URLs with credentials in them
   (`https://user:pass@...`), presigned URLs, and secrets in `app.json` `extra` (readable
   in the app through `expo-constants`).
5. **Secrets reaching logs or the screen**: `console.*` calls, error messages or UI text
   that include env values, the private key, session tokens or presigned URLs (see the
   crypto rules in `CLAUDE.md`).

Mark every finding here **must fix**.

### 1. Unused code

1. Run `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`. Each "declared but its value
   is never read" error is an unused variable, import, parameter or private function.
   These flags are for this check only. Don't add them to `tsconfig.json`.
2. Run `npx expo lint` and keep the unused-code warnings. If the project has no ESLint
   config (`eslint.config.*`), skip this step and say so in the report: on first run,
   `expo lint` installs packages and writes a config file.
3. Find exports nothing imports: for each `export` in scope, search `src/` for imports of
   that name from that file. Treat files in `src/app/` as used, because Expo Router loads
   them by file name, and so are their default exports.
4. Find files nothing imports, outside `src/app/`.
5. Find constants or config values defined but never read, including entries in
   `src/constants/` and `theme.ts`.
6. Find `package.json` dependencies that nothing imports. Check `app.json` plugins
   before calling a package unused, since config plugins are used without an import.

Parameters required by a callback's signature (for example `(_event, value) => ...`) are
not unused. For those, suggest a `_` prefix instead of removal.

### 2. Values outside src/constants/

Look for literal values that are configuration, not logic:

- URLs, hosts, ports and API paths (`'/auth/register'`)
- timeouts, intervals, delays, retry counts, size and length limits
- `expo-secure-store` keys and other storage keys
- the same literal repeated in more than one file
- `process.env.*` read anywhere except `src/constants/config.ts`
- hex colors, `rgb()` values and pixel sizes outside `theme.ts` (move to `theme.ts`)

Not findings: `0`, `1`, `-1`, `''`, `true`/`false`, array indexes, CSS-like layout values
used once (`flex: 1`), API field names in `api/types.ts`, and values that only make sense
next to the code that uses them. When unsure, list it under **Suggestions**, not as a
required move.

### 3. Text not in strings.ts

Find text a user can see or hear:

- text between JSX tags: `<Text>Send file</Text>`
- text props: `title`, `label`, `placeholder`, `accessibilityLabel`, `accessibilityHint`,
  `headerTitle` and similar
- `Alert.alert(...)` titles, messages and button labels
- error messages that get shown in the UI
- text built with template literals: `` `Sent ${name}` ``

Not findings: `testID`s, route paths, storage keys, log messages, API field names and
values, and file or MIME types. Never move secrets or tokens into strings.

Suggest a key for each item, grouped by screen or component, in camelCase:

```ts
// src/constants/strings.ts
export const strings = {
  home: {
    title: 'Project Dropper Mobile',
  },
  send: {
    pickFile: 'Pick a file',
    sent: (fileName: string) => `Sent ${fileName}`,
  },
  common: {
    cancel: 'Cancel',
  },
} as const;
```

Text with values in it becomes a function that takes those values, so it can be translated
as a whole sentence later. Don't build sentences by joining pieces.

Reuse an existing key when the same text with the same meaning is already in `strings.ts`.
Put text used on several screens under `common`.

### 4. Components to refactor

Look at components and screens (`.tsx` files) for:

- **Duplicated UI**: the same or nearly the same JSX in two or more places. Suggest one
  component in `components/`, with props for the parts that differ.
- **Not using the shared components**: screens that build their own windows, title bars,
  buttons, text fields, lists, status bars or progress bars instead of using `Window`,
  `TitleBar`, `Button`, `TextField`, `ListBox`, `StatusBar` and `ProgressBar` from
  `components/` (see the UI rules in `CLAUDE.md`).
- **Repeated styles**: the same style objects in several `StyleSheet.create` calls, or the
  bevel (raised or sunken border) written out by hand. Suggest a shared style or theme token.
- **Inline styles**: `style={{ ... }}` objects that belong in `StyleSheet.create`.
- **Components doing too much**: a component over about 150 lines, rendering several
  separate sections, or mixing UI with data fetching, storage or crypto. Suggest how to
  split it: child components, a hook in `hooks/`, or logic in `lib/`.
- **Logic in screens**: `fetch` calls (belong in `api/client.ts`), crypto (belongs in
  `lib/crypto.ts`), secure storage (belongs in `lib/storage.ts`), or state logic repeated
  across screens (belongs in a shared hook).
- **Props that are hard to use**: long lists of boolean props, or the same group of props
  passed through several layers. Suggest variants, grouped props or context.

For each finding, say what the refactor would look like in a sentence or two (component
name, its props, which files would use it). Don't write the code. Mark each finding
**high**, **medium** or **low** by how much duplication or risk it removes.

## Report

Report the findings without changing anything.

1. **Summary**: one line per category with its number of findings.
2. **One section per category**, in this order:
   1. Exposed secrets and environment variables
   2. Unused code
   3. Values outside `src/constants/`
   4. Text not in `strings.ts`
   5. Components to refactor

   Each section is a table with columns: File, Line, Found, Suggested fix. Components to
   refactor also has a Priority column, with high first. If a category has no findings,
   keep its heading and write "Nothing found."
3. **Suggestions**: borderline items that could reasonably stay where they are.
4. **Files to create**: new files the suggested fixes need (for example
   `src/constants/strings.ts`).
5. **Skipped**: any check that couldn't run, and why.

End the report there. Don't offer to apply the fixes, and don't start fixing.
