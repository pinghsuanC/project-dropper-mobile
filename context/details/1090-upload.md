# 1090: Upload

Accepted, implemented (Parts 1 UI, 2 sending, 3 failures and Retry) · 2026-11-17 · Part of [1000 App](1000-app.md)

The "Pending upload" screen (`/upload`, in the `(taskbar)` group), opened from Home's
"Do you want to upload? Yes". The user picks files into a queue and sends them to the
paired PC. Prototypes: `context/prototypes/upload/`. Built in three parts on
`feature-branch-upload`: 1 the UI, 2 sending, 3 failures and Retry.
Components are in [2010](2010-components.md); GIF slots in [2040](2040-gifs.md).

## Layout (top to bottom, scrolls on short screens)

Laid out like Server status ([1070](1070-server-files.md)), and shares its name search
(`lib/search.ts` `matchesName`).

1. `banner` GIF, large.
2. **Window** "Pending upload" (✕ goes Home):
   - **Search field** (as Server status). While sending, the `sending` GIF (small) takes
     its place.
   - **FileList**, upload variant: "name · size", then ✕ (queued), `%` in a fixed-width box
     (sending; no mini bar since 2026-11-18), "Waiting", or "Failed" (error tone). Empty: "Your upload queue is empty";
     no match: "No files match …".
   - While sending, a rolling (indeterminate) **ProgressBar** under the list, running until
     the upload finishes.
   - **Buttons**: Clear all (left) · Add… (folder icon) · Upload ("Sending…" while sending).
   - **StatusBar**: connection · "N files" (or "Sending 2 of 3") · the time.
3. **Back** ConfirmWindow: "Back to home screen?", the note about in-progress and failed
   items, **Yes** → Home (`router.dismissTo('/home')`), **No** disabled: the window can't
   be dismissed, as with Home's Upload window. (The prototype's Confirm / Cancel became
   Yes / No on 2026-11-18, to match Home.)
4. **Taskbar** from the `(taskbar)` layout.

| Control | Enabled when |
|---|---|
| Clear all | the queue isn't empty and nothing is sending |
| Add… | nothing is sending |
| Upload | connected (`paired`), a `queued` file, nothing sending, not a testing-menu look |
| Retry failed | shown in Upload's place while a file is Failed (Clear all and Add… hidden); enabled when connected, not a look |

## The queue (`lib/uploadQueue.ts`)

Pure rules here; the queue itself lives in the session store (`uploadQueue`, 1030), so it
outlives the screen. Not kept across app restarts.

- **Add…** opens `expo-document-picker` (`multiple: true`, `copyToCacheDirectory: false`).
  Cancel changes nothing; a picker failure shows "Couldn't open your files…".
- **No cache copy (2026-11-17, found on the phone):** in Expo Go, expo-file-system only reads
  inside the running project's own folders, and the picker's cache copy lands outside them:
  `File.digest` failed with "Missing 'READ' permission for accessing the file", so every
  send ended "0 of N sent". The picker's own `content://` link isn't checked that way
  (another app's provider) and `File` reads it through the content resolver: `digest`
  streams it and `upload` sends it with its real size. Nothing is copied, so there are no
  cache copies to clean up. The link stays readable while the app runs (the queue isn't
  kept across restarts anyway).
- Picked files join the **end** of the queue in pick order, status `queued`. The picker's
  `uri` is the id; the same document picked again is skipped as the same name and size.
- **Size limit:** `MAX_UPLOAD_BYTES` in `config.ts`, 500 MB counted in 1024s (as sizes are
  shown; raised from 100 MB on 2026-11-18). The server has no limit. A file **over** it is
  never added; exactly 500 MB is.
  The rest of the same pick is added.
- A file the picker gives **no size** for is never added (it can't be checked).
- A file already queued (same name and size), or twice in one pick, is skipped silently.
- One error popup per pick for files left out (`pickProblem`): one too large → "x is too
  large (2.4 GB). Files can be up to 500 MB."; several → "N files are too large…"; else
  the no-size messages. Too large wins when both happen.
- ✕ removes a file; Clear all empties the queue; search filters what's shown, not the queue.

## Connection

Opening the screen runs Home's `checkConnection()` once ([1060](1060-home.md)): "Checking…",
then "Connected" with a green dot (paired), "Not connected" (no PC paired) or "Can't reach
server". Part 2 enables Upload only when connected. As on Home, "Checking…" stays at least
`MIN_CHECKING_MS` (800 ms, `lib/wait.ts` `atLeast`, 2026-11-18), so Upload stays off
until then; a testing-menu look shows Connected at once. The check and its status bar
segment live in `lib/useConnection.ts` (`useConnection`, `connectionSegment`; texts in
`strings.connection`), shared with Server status (1070) since 2026-11-18.

## Popups

Dialogs over the screen; the screen is hidden from TalkBack while one is open, and Android
Back closes it.

| Popup | Kind | Title / heading | Message |
|---|---|---|---|
| File(s) left out of a pick | error | Error | see the queue rules |
| Some or all files failed | error | Upload / Error | "2 of 3 sent. Please retry." ("0 of 3…" when none) |
| All sent | info | Upload / Upload complete | "3 files sent to your PC." ("1 file…") |

## Testing menu

`?state=inProgress | partialFailed | tooLarge | success` opens that look with a mock queue
(`components/dev/mockUploadQueue.ts`), skipping the connection check (shown as
Connected). Plain `/upload` is the real empty start.

## Sending (`lib/sendQueue.ts`)

`sendQueue()` runs outside React and reports into the session store (`uploadQueue`,
`uploadSending`, `uploadOutcome`, 1030), so a send carries on when the user leaves `/upload`
and the screen shows the same state on return. It never throws.

1. The files to send (`queued` for Upload, `failed` for Retry failed) turn `waiting`;
   `uploadSending` = 0 of m: the status bar reads "Preparing…".
2. **Checksum** per file: `fileChecksum(uri)` in `lib/crypto.ts`, `expo-file-system`
   `File.digest('SHA-256')`. Hashed natively in 64 KB reads, so a 500 MB file never sits
   in JS memory; checked to be 64 lowercase hex characters.
   **"Preparing…" stays on screen (2026-11-18):** the checksums and the prepare below are
   wrapped in `atLeast(…, MIN_PREPARING_MS)` (`config.ts`, 600 ms), so the sending GIF and
   rolling bar are seen before "Sending 1 of m". A failure there still fails the send, after
   the wait; the run-id check runs after it, so a reset during the wait writes nothing.
3. One **`POST /files/prepare-batch-upload`** to the paired PC (`pairedWith.deviceId`),
   `client_ref` `q0`, `q1`, … in queue order; `content_type` = the picker's `mimeType`, else
   `DEFAULT_CONTENT_TYPE` (`config.ts`). Results are matched by `client_ref`, not position.
4. Each file is **PUT** to its `upload_url` one at a time, in order (`api/upload.ts`
   `putFile`: `File.upload` with `httpMethod: 'PUT'`, raw bytes, no auth header). The
   status bar reads "Sending n of m"; the row shows `%` from the upload's progress.
   **Progress never goes back (2026-11-18, seen on the phone: 0% → 12% → 1% → up):** the
   native upload counts the bytes of each attempt at the request body from 0, so a retried
   connection starts over. `putFile` skips any report lower than the highest one so far (it
   still restarts the stall wait, since bytes are moving), and the row rounds down, so 100%
   shows only once every byte is written. A non-2xx answer from R2 is a failure (the upload resolves on any status). The
   url never reaches a log or an error. **Stall timeout:** no progress for
   `UPLOAD_STALL_TIMEOUT_MS` (30 s, `config.ts`) cancels the upload through its `signal`,
   and it fails like any other; each progress report restarts the wait, so a slow but moving
   500 MB upload is never cut (the server calls keep `api/client.ts`'s 10 s timeout).
5. A file whose PUT worked **leaves the list** (`upload-in-progress.png`: "Sending 2 of 3"
   over two rows). One that failed reads "Waiting" until the send ends.
6. One **`POST /files/finish-batch-upload`** with the `file_id`s whose PUT worked. It is
   strict on the server: a 404 / 409 marks none, so every file of that send fails.
7. All confirmed: outcome `sent` → the info popup "N files sent to your PC.". Otherwise
   see Failures. OK (or Android Back) clears the outcome.

## Failures and Retry (Part 3)

- **Failed:** every file of a send that `finish-batch-upload` didn't confirm ends `failed`,
  whatever went wrong (a checksum, prepare, its PUT, finish, offline, 401 / 403 / 404 / 409),
  in its first order at the front of the queue. Failed rows read "Failed" in the error tone,
  with no ✕.
- **Popup:** outcome `partial` `{ sent, total }` → "2 of 3 sent. Please retry."
  (`upload-partial-failed.png`), "0 of 3…" when none got through.
- **Retry failed** (the HTML prototype's partial mode): while the queue has a Failed file and
  nothing is sending, it takes Upload's place and Clear all and Add… are hidden. It sends only
  the failed files, as a new send (fresh checksum and prepare); its look and outcomes are
  Upload's.
- **No message per status:** a 401 (session over 24 h), 403 (revoked) or 404 (PC gone) is a
  failure like any other, as on Home (1060) and Server status (1070); logging in again is left
  for later.
- **Leaving** `/upload` (losing focus: Yes, ✕, the taskbar, Android Back) drops the
  failed files (`dropFailed`) and a "Please retry" outcome with them, so it can't come back
  over an empty queue (the taskbar sits outside the popup); an "all sent" popup stays. A
  running send's waiting and sending files stay. A file that fails after you've left stays
  Failed, with its popup, until you next leave.
- **Server rows:** each failed send leaves `pending` rows; Server status shows them as
  Incomplete (1070) until `POST /files/cancel` (🚧) or the server's cleanup sweep exists.

## A send that is replaced

Each send has a run id in `uploadSending`. After every wait (checksum, prepare, a PUT, its
progress, finish) the send checks it's still the running one; if a reset replaced it (the
phone sent back to Register, 1010) it stops and writes nothing more, so a stale send never
refills a reset queue or touches a newer send's files.

A testing-menu look keeps its own mock queue: it never reads or changes the store, and its
Upload stays disabled.

## Not done

Logging in again after a 401; cancelling a send; parallel PUTs; chunking (Future Features).
