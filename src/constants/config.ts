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
} as const;

/** The `platform` this app registers as. */
export const DEVICE_PLATFORM = 'android';

/** A request with no answer after this long counts as "server unreachable". */
export const REQUEST_TIMEOUT_MS = 10_000;

/** How long Landing's Welcome / Not registered popups stay before redirecting. */
export const POPUP_REDIRECT_MS = 2_000;

/** expo-secure-store keys. Allowed characters: letters, digits, `.`, `-`, `_`. */
export const STORAGE_KEYS = {
  privateKey: 'device.private_key',
  deviceId: 'device.id',
  userName: 'device.user_name',
  deviceName: 'device.name',
} as const;
