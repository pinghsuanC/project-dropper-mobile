# Feature Parts

The parts of the feature named in [current-feature.md](current-feature.md) `## Scope`.
Managed by `/current-feature`; cleared by `complete` once the whole feature is in `main`.

## Next

<!-- Parts planned but not started, in order. Each is a "### Part N: <title>" block with
the notes worked out so far (source, goal, requirements, open questions). `load` moves
the first one into ## Details of current-feature.md. -->

### Part 2: Home behaviour and calls

**Source:** user description (2026-11-16), `context/prototypes/home/`, prototype script
(`startServerCheck`, `tick`).

**Goal:** Make Home's looks come from real state instead of the testing menu, for the
**not connected** path first.

**Decided (2026-11-16):** "Checking…" checks whether the phone is paired with a PC. Pairing
routes are 🚧 (`GET /devices/paired`), so build the not-connected route now: Home decides
its look from the session's `pairedWith` (null → Not connected → "I want to connect to my
PC" → Pairing). The paired check and its "Checking…" → "Server connected" / "Can't reach"
flow wait for the server route.

**Known so far**
- Greeting and date stay current while Home is open (prototype `tick()`): update when the
  part of day or the date changes.
- Quote of the day: pick from `assets/quotes.json` by date (no server route).
- GIF picks: local fallbacks only (2040; no route yet).
- Retry (can't-reach look) re-runs the check once there is one.

**Open questions**
- Which server calls, if any, does Part 2 make now that `GET /devices/paired` is 🚧? Maybe
  none until pairing exists, or `GET /auth/me` to confirm the session is still valid.
- Should Part 2 wait for the server's pairing routes, or ship the not-connected logic and
  clock/quote now?

## Done

- 2026-11-16: Part 1: Home UI and redirection
