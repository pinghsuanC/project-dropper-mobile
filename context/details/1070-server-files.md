# 1070: Server files

Accepted, implemented · 2026-11-17 · Part of [1000 App](1000-app.md)

The "Server status" screen (`/server-files`, in the `(taskbar)` group), opened from Home's
"View server files". It lists the files **this phone sent that the PC hasn't downloaded
yet**. Prototypes: `context/prototypes/server/server-files.png`, `server-empty.png`.
Components are in [2010](2010-components.md); the GIF slot in [2040](2040-gifs.md).

## Layout (top to bottom, scrolls on short screens)

1. `banner` GIF, large.
2. **Window** "Server status": its ✕ goes to Home.
   - **Search field**: TextField with the `search` icon, placeholder "Search files", no
     visible label (`labelHidden`; screen readers still hear "Search files").
   - **FileList** (fixed height, scrolls inside): name over "size · type · Uploaded when · status".
   - **Buttons**: Back (always), Retry (only after a failed load).
   - **StatusBar** (added 2026-11-18, as on Upload, 1090): the connection ("Checking…",
     then "Connected" with the green dot, "Not connected" or "Can't reach server") ·
     "N files" (only once the list has loaded) · the time. The connection is Home's
     `checkConnection()` through `lib/useConnection.ts`, the hook Upload uses too, with
     "Checking…" held for `MIN_CHECKING_MS`. Retry checks the connection again along with
     the list. A testing-menu state shows Connected without checking.
3. **Taskbar** from the `(taskbar)` layout.

Back and ✕ use `router.dismissTo('/home')`: back to the Home already in the stack, or a
replace when the screen was opened another way (testing menu), so Back never stacks a
second Home.

## Where the list comes from

`GET /files/sent` (`getSentFiles()`, `api/files.ts`), once when the screen opens. The
server takes the sender from the session: the request names no device. It returns only
`pending` and `uploaded` files, newest first; the screen keeps that order.

| Load | List shows | Retry |
|---|---|---|
| Loading | "Loading…" | no |
| Failed (any error: unreachable, 401, 403, 5xx) | "Can't reach your server" | yes: loads again |
| Loaded, no files | "No files on server" | no |
| Loaded, search matches nothing | `No files match "x"` (the trimmed query) | no |

## Rows

- **Name** cut to `FILE_NAME_MAX` (20) characters + "…" (`trimName`, counts characters, not
  UTF-16 units). The row's accessibility label has the full name and the detail line.
- **Detail** (`strings.format.fileDetail`): `formatSize` · type · "Uploaded" + `formatWhen`
  of `created_at` (when the upload was prepared) · status. The **type** is the name's
  extension in capitals (`fileType`: "JPG"; "GZ" for `.tar.gz`), left out when the name has
  none (`Makefile`, `.gitignore`); `/files/sent` has no content type, so the name is the
  only source. Sizes: "845 KB", "2.3 MB" (one decimal, no trailing ".0"). Times:
  ("Today 4:12 PM", "Yesterday", "Nov 10", or "Nov 10, 2025" in an earlier year; local
  calendar days, `DATE_LOCALE`). The times re-read the clock (`useNow`), so "Today" turns
  into "Yesterday" at midnight while the screen is open.
- **Status**: every row ends with the file's server status, first letter capitalized
  (`strings.format.fileStatus`): "2.3 MB · JPG · Uploaded Today 4:12 PM · Pending". Every status
  uses the same muted tone, nothing is shown as an error (decided 2026-11-17, replacing an
  earlier red "Incomplete" in place of the date; the prototype has no status). The list
  loads once, so a status that changes while the screen is open shows on the next visit
  (live updates are a future feature).

## Search

Filters as you type, by name, ignoring case on both sides, ignoring spaces around the
query. Clearing it shows every file again.

## Testing menu

`?state=files` shows `mockSentFiles(now)` (`components/dev/`, the prototype's six files,
one `pending`, times counted back from now); `?state=empty` shows "No files on server".
Neither calls the server; prod builds ignore both.

## Not built yet

Refreshing while the screen stays open, selecting a row, and acting on `pending` files.
