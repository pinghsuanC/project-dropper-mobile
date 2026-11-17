# Open Decisions

Not decided yet. Once one is, it becomes a numbered record in `context/details/` (and a row
in its `README.md`) and leaves this list. Questions already written up in a record stay
there, not here: final GIF slots and addresses (2040), the `eas.json` profiles (1020).

## Server routes

- **GIFs:** 2040 wants one pick per slot at start-up (e.g. `GET /gifs`), but the server
  only plans one `welcome_gif` in `/auth/me` (🚧 in its `API.md`). Agree a route with the
  server.
- **Quote of the day:** keep the local list (`assets/quotes.json`) or add a server route.
- **Sharing "loading" timeout:** 10–15 s suggested. Normal requests use 10 s
  (`REQUEST_TIMEOUT_MS`).

## UI

- **Error popup headings:** Landing's popups have their own titles, and Shared file uses
  "Process Aborted" and Upload success "Upload complete". Register uses "Error" (1050).
  Home, Pairing and Upload errors still need theirs.
- **Narrow screens:** check every screen at ~360 px wide; the Upload button row is the
  tightest.
- **App icon and name:** `app.json` still has Expo's default icon and the name
  `project-dropper-mobile`, which Android shows in its Share menu.

## Setup

- **Expo Go → dev build:** when to switch. Sharing (receiving files from the Share menu)
  needs a dev build.
