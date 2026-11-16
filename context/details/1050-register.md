# 1050: Register

Accepted, implemented · 2026-11-16 · Part of [1000 App](1000-app.md)

The first-launch screen (`/register`): the user names themself and the phone, and the app
registers the phone with the server, saves it and logs in. Storage and session rules are in
[1010](1010-app-state.md); the components in [2010](2010-components.md).

## Form

- **Your name**: empty to start, placeholder "e.g. Alex". **Local only**: saved on the phone,
  never sent to the server.
- **Device name**: starts as "My Android phone". Sent to the server as `name`.
- Both fields run `cleanName` (`lib/names.ts`) on every change, before the 20-character
  limit (`NAME_MAX_LENGTH`, `config.ts`): letters of any language, combining marks (`\p{M}`:
  accents typed separately, Indic vowel signs), digits, space, `-` and `_`; repeated spaces
  become one. It doesn't trim, so a space can be typed between words; submitting trims.
- **Both are required.** Empty after trimming → red status line, user name first ("Please
  enter your name.", then "Please enter a device name."). No server call.

## Flow (`lib/register.ts`, `registerPhone`)

```
fields + button disabled
"Creating keys…"   stored private key? reuse it : make a key pair, save the private key
"Registering…"     POST /auth/register { name: device name, platform: "android",
                                         public_key: PEM, fingerprint: SHA-256 of Android ID }
 ├─ network, timeout, 5xx, no server URL, storage error ─→ unreachable dialog  (nothing saved)
 ├─ any 4xx (400, 409, 422) ─────────────────────────────→ server-error dialog (nothing saved)
 └─ device_id → saveDevice { deviceId, userName, deviceName } → session identity
     log in (lib/login.ts, shared with start-up): challenge → sign → verify → /auth/me
     ├─ any failure ─→ router.replace('/')   Landing logs in again (Welcome or Retry)
     └─ "Registered!" (success green) → 700 ms (REGISTERED_REDIRECT_MS) → router.replace('/home')
```

- **One registration at a time.** The screen sets a ref the moment it starts (cleared when a
  dialog closes), because the `busy` state only disables the button after the next render:
  two quick taps would otherwise make two keys on a first launch and could save one call's
  key with the other's `device_id`.
- `registerPhone` never throws; it returns `registered` · `loginFailed` · `unreachable` ·
  `rejected { status, detail }` and reports its steps (`keys`, `registering`) by callback.
- **A failed log-in goes to Landing, not back to the form** (decided 2026-11-16). The
  device is saved and its key is on the server, so registering again would send the same
  key and get a 409.
- **A 409 is not retried** with a new key (decided 2026-11-15): it shows the server-error
  dialog.
- A key made before an error stays saved: the next press reuses it. After an unregister,
  `clearDevice()` deletes the key, so Register makes a new one (1010).

## Error dialogs

`Dialog kind="error"`, heading "Error" for both (decided 2026-11-16), one OK button.

| Outcome | Message | Code box |
|---|---|---|
| unreachable | "Couldn't reach your server, so this phone wasn't registered. Make sure the server is running, then try again." | none |
| rejected | "The server couldn't register this phone." | Code = status; Details = `detailText(detail)` (`api/client.ts`: a 422 list becomes `field: message` lines) |

- OK, ✕ or Android Back (`BackHandler`, only while the dialog is open) closes it,
  re-enables the form and clears the status. The names typed stay.
- While it's open, the form's `ScrollView` has `importantForAccessibility="no-hide-descendants"`
  so TalkBack stays in the dialog (2010 "Dialog and screen readers").
- Testing menu: `?state=unreachable` and `?state=serverError` open the screen with that
  dialog (sample code "XXX" and details); ignored in prod.

## Layout

`ScrollView` (taps go through with the keyboard open) holding the large `banner` Gif and the
"Welcome to File Dropper" Window (title-bar buttons disabled): intro, the two TextFields,
the large button, and a status line (`sizes.statusLineHeight`, so it doesn't jump;
`accessibilityLiveRegion="polite"` so TalkBack reads the steps). The Dialog sits outside the
ScrollView so its overlay covers the whole screen.

## To check on a phone

Jest runs on Node's regex engine and RN's test renderer; these need a real device:
`\p{L}` / `\p{M}` / `\p{N}` under Hermes, no flash of a rejected character in the filtered
fields, and the keyboard not covering the button.
