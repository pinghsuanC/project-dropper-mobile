// The Register flow (context/details/1050): make or reuse the key, POST /auth/register, save
// the device, then log in. Returns an outcome for the screen; it never throws.
// The user name stays on the phone: only the device name is sent.
import { registerDevice } from '@/api/auth';
import { ApiError, detailText } from '@/api/client';
import { deviceFingerprint, generateKeyPair, publicKeyFor, publicKeyToPem } from '@/lib/crypto';
import { logIn, startSession } from '@/lib/login';
import { getPrivateKey, saveDevice, savePrivateKey } from '@/lib/storage';

/** The steps the screen shows while registering. */
export type RegisterStep = 'keys' | 'registering';

export type RegisterOutcome =
  /** Registered, saved and logged in: go Home. */
  | { kind: 'registered' }
  /** Registered and saved, but the log-in after it failed: Landing logs in again. */
  | { kind: 'loginFailed' }
  /** No usable answer (network, timeout, 5xx, no server URL, storage): nothing saved. */
  | { kind: 'unreachable' }
  /** The server refused this phone (any 4xx): nothing saved. */
  | { kind: 'rejected'; status: number; detail?: string };

export type NameProblem = 'userNameRequired' | 'deviceNameRequired';

/** Already trimmed by the screen. */
export type Names = { userName: string; deviceName: string };

/** The first missing name, user name first; null when both are given. */
export function validateNames({ userName, deviceName }: Names): NameProblem | null {
  if (!userName.trim()) return 'userNameRequired';
  if (!deviceName.trim()) return 'deviceNameRequired';
  return null;
}

export async function registerPhone(names: Names, onStep?: (step: RegisterStep) => void): Promise<RegisterOutcome> {
  let deviceId: string;
  let privateKey: Uint8Array;
  try {
    onStep?.('keys');
    privateKey = await storedOrNewKey();

    onStep?.('registering');
    deviceId = await registerDevice({
      name: names.deviceName,
      publicKey: publicKeyToPem(await publicKeyFor(privateKey)),
      fingerprint: deviceFingerprint(),
    });
    // The session identity is set by startSession below (or by Landing after a failed log-in).
    await saveDevice({ deviceId, ...names });
  } catch (error) {
    return failureOf(error);
  }

  // From here the device is saved: a failed log-in is for Landing to retry, not Register.
  try {
    const token = await logIn(deviceId, privateKey);
    await startSession({ deviceId, userName: names.userName }, token);
  } catch {
    return { kind: 'loginFailed' };
  }
  return { kind: 'registered' };
}

/**
 * The stored private key, or a new one (saved first). Start-up's missing-key path may already
 * have made one; after an unregister there is none (1010).
 */
async function storedOrNewKey(): Promise<Uint8Array> {
  const stored = await getPrivateKey();
  if (stored) return stored;
  const { privateKey } = await generateKeyPair();
  await savePrivateKey(privateKey);
  return privateKey;
}

/** A 4xx means the server refused this phone; anything else, registering again may help. */
function failureOf(error: unknown): RegisterOutcome {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return { kind: 'rejected', status: error.status, detail: detailText(error.detail) };
  }
  return { kind: 'unreachable' };
}
