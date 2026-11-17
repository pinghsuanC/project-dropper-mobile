# Current Feature

## Scope

- Feature:
- Feature branch:
- Parts: [current-feature-parts.md](current-feature-parts.md)

## Current part

- Status: Not Started
- Branch:

## Details

# History

- 2026-11-17: Pairing step 1: scan the PC's QR code with the camera, with a camera-access note first and an error when access is denied; the scanned text is printed for now
- 2026-11-17: Server status rows show each file's type, an "Uploaded" date and its status, with nothing in red
- 2026-11-17: Server files: the files this phone sent that the PC hasn't downloaded yet, from the server, with search, Retry, empty and Incomplete rows, and Back to Home
- 2026-11-17: Home screen: greeting and quote of the day, a connection check against the server and the paired PC with its four looks and Retry, the Upload question and the taskbar
- 2026-11-16: Home checks the server and the paired PC when it opens, with Checking…, Retry, a live greeting and date, and a quote of the day
- 2026-11-16: Home screen UI: greeting balloon, GIFs, the not-connected, connected and can't-reach looks with their buttons, the Upload question and the taskbar
- 2026-11-16: Register screen: name the phone, make its key, register it with the server, save it and log in, with error dialogs; a phone the server has forgotten goes back to Register
- 2026-11-16: Register this phone: name it, make its key, register with the server, save it and log in, with error dialogs; a phone the server has forgotten is cleared and sent back to Register
- 2026-11-15: Add a text field with a character counter and an error dialog, the pieces the Register screen is built from
- 2026-11-15: The README opens with the app's flow: the five main screens, a flowchart and a sentence per step, plus an up-to-date overview and open decisions
- 2026-11-15: Routes and basic pages: a route for every screen, the Windows 98 theme and first UI components, log-in at start-up, and a dev testing menu that opens any screen state
- 2026-11-14: Screens read the testing menu's state through one typed hook and show it; release builds ignore it
- 2026-11-14: Add a dev-only testing menu at /dev and a floating DEV button that opens it from any screen
- 2026-11-14: Log in on every launch from Landing and go to Home, Register, or a Retry popup
- 2026-11-14: Add secure storage, device key signing and the server client that start-up login will use
- 2026-11-14: Add the Windows 98 theme, fonts and the first shared UI components, with a static preview on Landing
- 2026-11-13: Add a route and placeholder page for every screen, and a Zustand session store for app state
- 2026-11-13: Add CI that lints, type checks and tests every PR and push to main, and auto-merges passing PRs
- 2026-11-13: Discussed and built the HTML prototype, and captured a screenshot of each screen into `context/prototypes/` (numbered frames for timed flows)

# Future Features

<!-- Only change this section when the user asks, through /current-feature future. -->

Grouped by the app's sections (the same ones as the prototype's dev menu).

## Register
- User register and login

## Pairing
- Cancel button on Pairing step 2 (while waiting for the server)

## Server
- Storage size limit (keep the total below 30 GB)
- Storage free tier checking (stop working if the current month's quota has been met)
- Live file statuses on Server status: refresh the list while the screen is open, so a status change (e.g. the PC downloading a file) shows without reopening it

## Upload
- Rename files on the phone
- File previews
- Chunking larger files (allow up to 10 GB)
- Cancel during upload

## Device & User (Properties)
- Delete registry from server: un-registers the phone, deletes the local key (PEM) and device ID, and so disconnects it from the PC. Asks for confirmation first

## Whole app
- iOS compatibility (turn it into a web app)
- Multi-language support (all text is already in `strings.ts`; CJK fonts noted in `context/details/2020-typography.md`)
- Custom splash screen: Win98 teal background and a pixel-art icon, matching Landing so the handoff doesn't flash. Android 12+ allows only a colour and one centred image (masked to a circle); no text or GIFs. Check it in a release build, not Expo Go
