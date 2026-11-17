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
   - **FileList** (fixed height, scrolls inside): name over "size · when".
   - **Buttons**: Back (always), Retry (only after a failed load).
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
- **Detail**: `formatSize` ("845 KB", "2.3 MB": one decimal, no trailing ".0") · `formatWhen`
  ("Today 4:12 PM", "Yesterday", "Nov 10", or "Nov 10, 2025" in an earlier year; local
  calendar days, `DATE_LOCALE`). The times re-read the clock (`useNow`), so "Today" turns
  into "Yesterday" at midnight while the screen is open.
- **`pending`** (the upload started but was never confirmed): "size · Incomplete" in the
  error tone instead of the date (decided 2026-11-17; the prototype has no such row).
  Retrying or cancelling it waits for `POST /files/cancel` (🚧).

## Search

Filters as you type, by name, ignoring case on both sides, ignoring spaces around the
query. Clearing it shows every file again.

## Testing menu

`?state=files` shows `mockSentFiles(now)` (`components/dev/`, the prototype's six files,
one `pending`, times counted back from now); `?state=empty` shows "No files on server".
Neither calls the server; prod builds ignore both.

## Not built yet

Refreshing while the screen stays open, selecting a row, and acting on `pending` files.
