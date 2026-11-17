# 1090: Upload

Accepted, Part 1 (UI) implemented · 2026-11-17 · Part of [1000 App](1000-app.md)

The "Pending upload" screen (`/upload`, in the `(taskbar)` group), opened from Home's
"Do you want to upload? Yes". The user picks files into a queue and sends them to the
paired PC. Prototypes: `context/prototypes/upload/`. Built in three parts on
`feature-branch-upload`: 1 the UI (this record), 2 sending, 3 failures and Retry.
Components are in [2010](2010-components.md); GIF slots in [2040](2040-gifs.md).

## Layout (top to bottom, scrolls on short screens)

Laid out like Server status ([1070](1070-server-files.md)), and shares its name search
(`lib/search.ts` `matchesName`).

1. `banner` GIF, large.
2. **Window** "Pending upload" (✕ goes Home):
   - **Search field** (as Server status). While sending, the `sending` GIF (small) takes
     its place.
   - **FileList**, upload variant: "name · size", then ✕ (queued), `%` + a mini ProgressBar
     (sending), "Waiting", or "Failed" (error tone). Empty: "Your upload queue is empty";
     no match: "No files match …".
   - While sending, a rolling (indeterminate) **ProgressBar** under the list, running until
     the upload finishes.
   - **Buttons**: Clear all (left) · Add… (folder icon) · Upload ("Sending…" while sending).
   - **StatusBar**: connection · "N files" (or "Sending 2 of 3") · the time.
3. **Back** ConfirmWindow: "Back to home screen?", the note about in-progress and failed
   items, Confirm → Home (`router.dismissTo('/home')`), Cancel disabled (as in the
   prototype).
4. **Taskbar** from the `(taskbar)` layout.

| Control | Enabled when |
|---|---|
| Clear all | the queue isn't empty and nothing is sending |
| Add… | nothing is sending |
| Upload | Part 1: never. Part 2: connected, queue not empty, nothing sending |

## The queue (`lib/uploadQueue.ts`)

Pure rules; the screen keeps the queue in state (Part 2 moves it into the session store, 1010).

- **Add…** opens `expo-document-picker` (`multiple: true`, `copyToCacheDirectory: true`).
  Cancel changes nothing; a picker failure shows "Couldn't open your files…".
- Picked files join the **end** of the queue in pick order, status `queued`. The cache
  copy's `uri` is the id.
- **Size limit:** `MAX_UPLOAD_BYTES` in `config.ts`, 100 MB counted in 1024s (as sizes are
  shown). The server has no limit. A file **over** it is never added; exactly 100 MB is.
  The rest of the same pick is added.
- A file the picker gives **no size** for is never added (it can't be checked).
- A file already queued (same name and size), or twice in one pick, is skipped silently.
- One error popup per pick for files left out (`pickProblem`): one too large → "x is too
  large (2.4 GB). Files can be up to 100 MB."; several → "N files are too large…"; else
  the no-size messages. Too large wins when both happen.
- ✕ removes a file; Clear all empties the queue; search filters what's shown, not the queue.

## Connection

Opening the screen runs Home's `checkConnection()` once ([1060](1060-home.md)): "Checking…",
then "Connected" with a green dot (paired), "Not connected" (no PC paired) or "Can't reach
server". Part 2 enables Upload only when connected.

## Popups

Dialogs over the screen; the screen is hidden from TalkBack while one is open, and Android
Back closes it.

| Popup | Kind | Title / heading | Message |
|---|---|---|---|
| File(s) left out of a pick | error | Error | see the queue rules |
| Partial failure (Part 3) | error | Upload / Error | "2 of 3 sent. Please retry." |
| Success (Part 2) | info | Upload / Upload complete | "3 files sent to your PC." |

## Testing menu

`?state=inProgress | partialFailed | tooLarge | success` opens that look with a mock queue
(`components/dev/mockUploadQueue.ts`), skipping the connection check (shown as
Connected). Plain `/upload` is the real empty start.

## Still open (Parts 2 and 3)

Sending (checksum, `prepare-batch-upload`, PUT to R2, `finish-batch-upload`, progress),
keeping in-progress files when leaving, failures and Retry: see the parts file.
