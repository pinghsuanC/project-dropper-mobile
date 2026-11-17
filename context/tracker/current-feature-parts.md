# Feature Parts

The parts of the feature named in [current-feature.md](current-feature.md) `## Scope`.
Managed by `/current-feature`; cleared by `complete` once the whole feature is in `main`.

## Next

<!-- Parts planned but not started, in order. Each is a "### Part N: <title>" block with
the notes worked out so far (source, goal, requirements, open questions). `load` moves
the first one into ## Details of current-feature.md. -->

### Part 2: Send the queue to the PC

Source: user description ("part 2 handles calling the endpoint"), prototypes
`upload-send-*.png`, `upload-in-progress.png`, `upload-success.png`. Goal: Upload sends the
queued files to the paired PC and shows real progress, then the success popup.

Known so far:
- Upload is enabled when the connection check says paired and the queue isn't empty.
- Receiver: `device_id` from `GET /devices/paired` (`null` device → not paired, Upload stays
  disabled).
- Per file: read the bytes, `checksum` = lowercase hex SHA-256 (64 chars); `content_type`
  from the picker's `mimeType`, else `application/octet-stream`.
- `POST /files/prepare-batch-upload` → 201 `{ files: [{ client_ref, file_id, upload_url }] }`
  with `receiver_id, files: [{ client_ref, file_name, size, content_type, checksum }]`; then
  PUT each file's bytes to its `upload_url` (no auth header, never logged); then
  `POST /files/finish-batch-upload` with `file_ids` → `{ file_ids }`. Errors: 404 receiver
  unknown / revoked; 409 an upload missing / wrong size (none marked); 401, 403, 422.
- The PUT to R2 isn't a server call, but it still goes through `api/` (not the screen).
- While sending: the sending look from Part 1 ("Sending 2 of 3", `%` for the current file,
  Waiting for the rest, rolling bar, Add/Clear disabled). Sent files leave the queue
  (they're on Server status). All sent → success popup "N files sent to your PC."
- Queue moves into the session store, so in-progress and waiting files survive leaving
  `/upload` (1010); not kept across app restarts.
- Add `API_PATHS` entries; types in `api/types.ts`; client tests for both routes.

Open questions: one batch for the whole queue, or one file at a time with the single-file
routes ("Sending 2 of 3" suggests one at a time)? How to get upload progress (fetch has
none; `expo-file-system` upload task or XHR)? Hashing up to 100 MB in JS
(`@noble/hashes`) vs `expo-crypto`; needs `expo-file-system` to read bytes.

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

- 2026-11-17: Part 1: Upload page UI
