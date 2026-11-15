# Current Feature

## Scope

- Feature: Routes and basic pages
- Feature branch: feature-branch-routes-and-basic-pages
- Parts: [current-feature-parts.md](current-feature-parts.md)

## Current part

- Status: Not Started
- Branch: 

## Details

# History

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
