# Feature Parts

The parts of the feature named in [current-feature.md](current-feature.md) `## Scope`.
Managed by `/current-feature`; cleared by `complete` once the whole feature is in `main`.

## Next

<!-- Parts planned but not started, in order. Each is a "### Part N: <title>" block with
the notes worked out so far (source, goal, requirements, open questions). `load` moves
the first one into ## Details of current-feature.md. -->

### Part 2: Register flow and screen

**Source:** user description (2026-11-15), `context/prototypes/register/`,
`context/details/1010-app-state.md`.

**Goal:** Replace the Register placeholder with the real screen: two name fields, make the
key, `POST /auth/register`, save the device, log in, then Home.

**Decided (2026-11-15):** after "Registered!" the screen logs in (challenge → sign → verify
→ `/auth/me`, reusing start-up's code), then `router.replace('/home')`. A 409 is **not**
retried: it shows the server-error dialog with code 409 and the server's detail.

**Requirements known so far**
- Screen as `register.png`: large `banner` Gif on top, Window "Welcome to File Dropper"
  (title-bar buttons disabled), intro text, TextField "Your name" (placeholder "e.g. Alex",
  hint "What the app calls you.", 0/20) and "Device name" (default "My Android phone", hint
  "Letters, numbers, spaces, - and _ only.", n/20), button "Register this phone", status
  line under it.
- Both fields required: empty after trimming shows a red status line, "Please enter your
  name." first, then "Please enter a device name."; no server call.
- Name filter for both fields (`lib/names.ts` `cleanName`): keep letters (any language),
  digits, space, `-` and `_`; collapse repeated spaces; max 20 (`NAME_MAX_LENGTH` in
  `config.ts`). Check that Hermes supports the `\p{L}` / `\p{N}` regex escapes.
- On press: fields and button disabled. "Creating keys…": reuse the stored private key if
  there is one (start-up's missing-key path already made one), else `generateKeyPair()` +
  `savePrivateKey()`. "Registering…": `registerDevice({ name: deviceName, publicKey: PEM,
  fingerprint: deviceFingerprint() })` (SHA-256 hex of the Android ID), `saveDevice(...)`,
  session `setIdentity`, log in. "Registered!" in green, then Home. The user name is never
  sent to the server.
- Errors, split as start-up does: network error, timeout, 5xx or no server URL → Dialog
  "Couldn't reach your server, so this phone wasn't registered. Make sure the server is
  running, then try again." (no code box). Any 4xx (400, 409, 422) → Dialog "The server
  couldn't register this phone." with Code = status and Details = the server's detail (a
  422 list as text). OK closes it, re-enables the form and clears the status.
- Testing-menu states: `?state=unreachable` / `?state=serverError` open the screen with that
  dialog shown (existing `RegisterState`).
- While a Dialog is open (2010 "Dialog and screen readers"): the screen's content gets
  `importantForAccessibility="no-hide-descendants"` so TalkBack stays in the dialog, and
  Android's Back button does what OK does (`BackHandler`), instead of leaving the screen.
- Check on a phone: the controlled, filtered name fields don't flash a rejected character.
- Flow logic in a pure `lib/register.ts` returning an outcome, like `lib/startup.ts`; share
  the log-in helper with `startup.ts` instead of copying it.
- Strings in `strings.register`; drop the placeholder's `toHome`.

**Open questions**
- Log-in fails after a successful register (device already saved): show the same error
  dialogs and stay, or go to Landing, which logs in again?
- Error popup heading: the prototype uses "Error"; open-decisions lists Register's heading
  as undecided.
- Status line colour: `success` green on grey fails contrast (2030). Use a darker token?

## Done

- 2026-11-15: Part 1: TextField and Dialog components
