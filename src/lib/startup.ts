// The start-up order Landing runs (context/details/1010): read the stored device, log in
// with a signed challenge, check the session with /auth/me, and fill the session.
// Returns an outcome for Landing to show; it never throws.
import { ApiError } from '@/api/client';
import { generateKeyPair } from '@/lib/crypto';
import { logIn, startSession } from '@/lib/login';
import { clearDevice, deleteDeviceId, getDevice, getPrivateKey, savePrivateKey } from '@/lib/storage';
import { getSession } from '@/state/session';

export type StartupOutcome = 'welcome' | 'notRegistered' | 'unreachable';

/** Run start-up once. Retry calls it again. */
export async function runStartup(): Promise<StartupOutcome> {
  try {
    return await startup();
  } catch (error) {
    return outcomeOf(error);
  }
}

/**
 * A 4xx means the server answered and doesn't accept this device: register.
 * Anything else (network error, timeout, 5xx, no server URL) is "unreachable": Retry may
 * help, registering wouldn't.
 */
function outcomeOf(error: unknown): StartupOutcome {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return 'notRegistered';
  return 'unreachable';
}

async function startup(): Promise<StartupOutcome> {
  const device = await getDevice();
  if (!device) return 'notRegistered';

  const privateKey = await getPrivateKey();
  if (!privateKey) {
    // The stored device_id can never sign again: start over with a new key at Register.
    const { privateKey: newKey } = await generateKeyPair();
    await savePrivateKey(newKey);
    await deleteDeviceId();
    return 'notRegistered';
  }

  getSession().setIdentity(device);

  let token: string;
  try {
    token = await logIn(device.deviceId, privateKey);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
    // The server forgot this phone (e.g. its database was reset). Forget it here too: the
    // device_id, the names and the key, so Register starts clean with a new key (1010).
    await clearDevice();
    getSession().reset();
    return 'notRegistered';
  }

  await startSession({ deviceId: device.deviceId, userName: device.userName }, token);
  return 'welcome';
}
