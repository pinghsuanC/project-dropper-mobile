# 1100: Server config

Accepted, implemented · 2026-11-22 · Part of [1000 App](1000-app.md)

The deployed server sits behind a **Cloudflare Access** tunnel: Cloudflare answers every
request (`/health` and `/auth/*` included) before the server does, unless it carries a
service token. The phone gets that token from a QR code on the PC, made for this alone,
on the screen `/update-server-config`, which comes **before Landing**. Pairing (1080) is
unchanged.

The token is kept only in `expo-secure-store`, never in `.env`: every `EXPO_PUBLIC_*` value
is built into the JavaScript bundle (readable in the APK, served by Metro in dev, uploaded by
`eas update`).

## The server-config QR code

The desktop shows it as JSON, apart from the pairing QR code:

```json
{
  "cloudflare_client_id": "<service token client id> | null",
  "cloudflare_access_key": "<service token client secret> | null"
}
```

`serverConfigFrom()` (`lib/serverConfigQr.ts`) reads it into a `ServerConfig`:

- both non-blank strings → `{ kind: 'tunnel', access: { clientId, accessKey } }`
- both `null` (a PC without the env set) → `{ kind: 'noTunnel' }`, **only on local**
  (`CLOUDFLARE_ACCESS_REQUIRED` off); anywhere else it isn't a server-config code
- anything else (not JSON, not an object, a pairing code, one value missing, blank or not a
  string, one null) → `null`: "That isn't a File Dropper server code."

## When the screen shows

`lib/startup.ts` returns `serverConfig`, and Landing does `router.replace('/update-server-config')`
with no popup, when:

1. no `device_id` is stored (a new phone, or one the server forgot), unless the config was
   already done in this launch;
2. no Cloudflare values are stored and `CLOUDFLARE_ACCESS_REQUIRED` (`APP_ENV` isn't `local`:
   on local the phone talks to uvicorn directly);
3. Cloudflare refused a start-up call: the `GET /health` every start-up now runs first, or
   challenge / verify / `/auth/me` after it.

"Done in this launch" is a memory-only flag in `lib/serverConfig.ts` (not the session store,
whose `reset()` start-up calls when the server forgot the phone). Without it a new phone would
come straight back here after its scan, still having no `device_id`.

A refusal after start-up (Home, Upload, Server status, Pairing step 2) still shows that
screen's usual error; the next launch's `/health` catches it (decided 2026-11-22).

## The screen

The shared QR scan ([2010](2010-components.md) `QrScanStep`), as on Pairing step 1 (1080): the
same camera-permission order, camera window and errors, with its own text (`strings.serverConfig`):
balloon "Let's connect!", window "Connect to the server", the "Don't share" warning, the prompt
"Scan the code on the desktop if you want to join the server.", and a footnote. The ✕ is drawn
but off, and Android Back on the start look does nothing (`holdBack`): the app can't start
without a working server. Back still closes the camera and popups.

After a valid scan:

```
checking look ("Checking the server…", ProgressBar, at least MIN_CHECKING_MS)
applyServerConfig(config)  → GET /health with the scanned values (not the stored ones)
 ├─ ok          → save (tunnel) or clear (no tunnel) the values, hand them to the API
 │                client, mark the config done → router.replace('/') → Landing
 ├─ refused     → error "Those values didn't get through. Scan the QR code on your PC again."
 ├─ unreachable → error "Couldn't reach the server. …" (no answer, or a 503)
 └─ saveFailed  → error "Couldn't save the values on this phone. …" (the server answered,
                  but secure storage failed)
```

A failed check saves nothing, so a bad scan never replaces values that work. OK on the error
goes back to the start look, and a new scan look is mounted, so the camera reads again.

Testing-menu states (`ServerConfigState`): `cameraNote`, `camera`, `checking`, `error` (the
refused text); the plain entry is the start look. The menu lists them first, as the screen
comes before Landing.

## The API client

- `api/client.ts` keeps the values in memory (`setCloudflareAccess`), loaded once by start-up
  from storage and set by `applyServerConfig`, and adds `CF-Access-Client-Id` /
  `CF-Access-Client-Secret` to every request, public and protected. None stored: neither
  header. The R2 upload (`api/upload.ts`) never gets them.
- `checkHealth(access?)`: `GET /health` has no envelope; OK is 200 `{ "status": "ok" }`.
  Given `access`, it tries those values (null = none) instead of the stored ones.
- **`CloudflareRefusedError`** (an `ApiError` subclass, so code that only knows `ApiError`
  treats it as before): a 401 / 403 whose body isn't our JSON `detail` (the server's own
  errors always have one), or a response from Access's login page (`*.cloudflareaccess.com`,
  after a redirect). A non-JSON 5xx (e.g. a tunnel that's down) is not a refusal.
- Never logged, shown or put in an error: the client id and the access key.

## Storage

`getCloudflareAccess()` (null unless both are stored), `saveCloudflareAccess()`,
`clearCloudflareAccess()`, under `cloudflare.client_id` / `cloudflare.access_key`.
`clearDevice()` leaves them: they belong to the tunnel, not to this phone's registration.
