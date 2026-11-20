// App configuration (context/details/1010, 1020). The only file that reads process.env.
// Every EXPO_PUBLIC_ value is public: anyone with the APK can read it. Never put a secret here.

const APP_ENVS = ['local', 'dev', 'prod'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

function readAppEnv(raw: string | undefined): AppEnv {
  return APP_ENVS.find((env) => env === raw) ?? 'prod'; // missing or unknown → prod
}

export const APP_ENV: AppEnv = readAppEnv(process.env.EXPO_PUBLIC_APP_ENV);
export const SHOW_TESTING_MENU = APP_ENV !== 'prod';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '';

/** The server address, without a trailing slash. Throws when it isn't configured. */
export function apiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not set. Add it to .env (see .env.example).');
  }
  return API_BASE_URL.replace(/\/+$/, '');
}

/** Server routes (the server repo's API.md). */
export const API_PATHS = {
  register: '/auth/register',
  challenge: '/auth/challenge',
  verifyChallenge: '/auth/verify-challenge',
  me: '/auth/me',
  pairedDevice: '/devices/paired',
  claimPairing: '/pairing-request/claim',
  sentFiles: '/files/sent',
  prepareBatchUpload: '/files/prepare-batch-upload',
  finishBatchUpload: '/files/finish-batch-upload',
} as const;

/**
 * An upload to R2 that reports no progress for this long is cancelled (and counts as failed).
 * Reset on every progress report, so a slow but moving upload of a large file is never cut.
 */
export const UPLOAD_STALL_TIMEOUT_MS = 30_000;

/** `content_type` sent for a file the picker gave no MIME type for. */
export const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

/** The `platform` this app registers as. */
export const DEVICE_PLATFORM = 'android';

/** A request with no answer after this long counts as "server unreachable". */
export const REQUEST_TIMEOUT_MS = 10_000;

/** How long Landing's Welcome / Not registered popups stay before redirecting. */
export const POPUP_REDIRECT_MS = 2_000;

/** Most characters in the user name and the device name (Register, 1050). */
export const NAME_MAX_LENGTH = 20;

/** How long Register shows "Registered!" before going Home. */
export const REGISTERED_REDIRECT_MS = 700;

/**
 * Shortest time "Checking…" stays on screen on Home, Upload and Server status, so a fast answer
 * doesn't flash by (lib/useConnection.ts; 1060, 1070, 1090).
 */
export const MIN_CHECKING_MS = 800;

/**
 * Shortest time Pairing step 2 shows "Waiting for the server to respond…" before Home or the
 * error, so a fast claim doesn't flash by (1080).
 */
export const MIN_PAIRING_WAIT_MS = 2000;

/** Shortest time Upload's "Preparing…" stays before the first file goes (1090). */
export const MIN_PREPARING_MS = 600;

/** Locale for dates shown in the app (Home's date line). Text itself is in strings.ts. */
export const DATE_LOCALE = 'en-US';

/** How often Home re-reads the clock, so its greeting, date and quote stay current. */
export const CLOCK_TICK_MS = 60_000;

/**
 * The largest file Upload accepts: 500 MB, counted in 1024s as file sizes are shown
 * (lib/format.ts). Files over it are turned away when picked (1090). The server has no limit.
 */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

/** File names longer than this are cut, with "…", in file lists (2010 FileList). */
export const FILE_NAME_MAX = 20;

/** expo-secure-store keys. Allowed characters: letters, digits, `.`, `-`, `_`. */
export const STORAGE_KEYS = {
  privateKey: 'device.private_key',
  deviceId: 'device.id',
  userName: 'device.user_name',
  deviceName: 'device.name',
} as const;
