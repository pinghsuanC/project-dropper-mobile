# Details

How the app is designed and built, one topic per file. When a decision changes, add a
new file that replaces the old one (and say so in both) rather than rewriting history.

Thousands are areas, each with a short head file that lists its files. Files go in steps of 10
(`2010`, `2020`, …) so new ones can be inserted between without renaming.

| # | File | About |
|---|---|---|
| **1000** | [App](1000-app.md) | Area head: what the app is, screen map |
| 1010 | [App state and session](1010-app-state.md) | Storage vs session, start-up order |
| 1020 | [Environments and the testing menu](1020-environments.md) | `APP_ENV`, `API_BASE_URL`, who sees the dev menu |
| 1030 | [Session store and routes](1030-session-store.md) | Zustand session store, route layout, router testing notes |
| 1040 | [Server enums](1040-enums.md) | `enums.ts`: server `StrEnum`s as `as const` objects + union types |
| 1050 | [Register](1050-register.md) | Register form, name rule, register → save → log-in flow, error dialogs |
| 1060 | [Home](1060-home.md) | Home's four looks, the connection check (`/auth/me`, `/devices/paired`), live greeting and quote of the day, buttons, taskbar |
| 1070 | [Server files](1070-server-files.md) | "Server status": files sent and not downloaded yet (`/files/sent`), search, loading / failure / empty, rows with size, type, "Uploaded" date and status |
| 1080 | [Pairing](1080-pairing.md) | Step 1: scan the PC's QR code, camera permission order (note → Android → error), the scan-once hook; step 2 to come |
| 1090 | [Upload](1090-upload.md) | "Pending upload": the queue, picking files, the 100 MB limit, status bar, Back window, popups; sending in later parts |
| **2000** | [UI](2000-ui.md) | Area head: the look, list of UI files |
| 2010 | [UI components](2010-components.md) | Layers, folders, every component |
| 2020 | [Typography](2020-typography.md) | Text roles, tones, fonts |
| 2030 | [Colour palette](2030-colors.md) | Every colour by name, contrast, icons |
| 2040 | [GIFs](2040-gifs.md) | Slots, session picks, fallback, placeholders |
| 3000s | *(free: e.g. the API contract)* | |
