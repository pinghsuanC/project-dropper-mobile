# Feature Parts

The parts of the feature named in [current-feature.md](current-feature.md) `## Scope`.
Managed by `/current-feature`; cleared by `complete` once the whole feature is in `main`.

## Next

<!-- Parts planned but not started, in order. Each is a "### Part N: <title>" block with
the notes worked out so far (source, goal, requirements, open questions). `load` moves
the first one into ## Details of current-feature.md. -->

### Part 3: Failed uploads and Retry

Source: user description ("part 3 handles the failed outcomes (retry)"), prototype
`upload-partial-failed.png`, the Back window's note. Goal: when some files fail, mark them
Failed, show "N of M sent. Please retry.", and let the user retry the failed ones.

Known so far:
- Failures: PUT to R2 fails or times out, `finish-*` 409 (missing / wrong size), network
  errors, 404 receiver gone, 401 session expired (log in again once?), 403 device revoked.
- Failed rows show "Failed" (error tone, Part 1 look); sent ones leave the queue.
- Partial-failed popup "2 of 3 sent. Please retry." (title "Upload", heading "Error").
- Retry sends only the failed files again (a fresh `prepare-*`: the old `file_id`s stay
  `pending` on the server; `POST /files/cancel` is 🚧).
- Leaving `/upload` drops failed files; in-progress and waiting ones stay (1010).

Open questions: where Retry lives (the Upload button relabelled "Retry", or a button in
the popup); what 401 / 403 / 404 show; whether the leftover `pending` server rows matter
before `/files/cancel` exists.

## Done

- 2026-11-17: Part 2: Send the queue to the PC
- 2026-11-17: Part 1: Upload page UI
