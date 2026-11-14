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
| **2000** | [UI](2000-ui.md) | Area head: the look, list of UI files |
| 2010 | [UI components](2010-components.md) | Layers, folders, every component |
| 2020 | [Typography](2020-typography.md) | Text roles, tones, fonts |
| 2030 | [Colour palette](2030-colors.md) | Every colour by name, contrast, icons |
| 2040 | [GIFs](2040-gifs.md) | Slots, session picks, fallback, placeholders |
| 3000s | *(free: e.g. the API contract)* | |
