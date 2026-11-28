// The start-up order Landing runs (context/details/1010, 1100): read the stored device and
// Cloudflare values, send a phone without them to the server config, check GET /health, log in
// with a signed challenge, check the session with /auth/me, and fill the session.
// Returns an outcome for Landing to act on; it never throws.
import { setCloudflareAccess } from '@/api/apiHeaders';
import { ApiError, checkHealth, CloudflareRefusedError } from '@/api/client';
import { CLOUDFLARE_ACCESS_REQUIRED } from '@/constants/config';
import { generateKeyPair } from '@/lib/crypto';
import { logIn, startSession } from '@/lib/login';
import { isServerConfigDone } from '@/lib/serverConfig';
import { clearDevice, deleteDeviceId, getCloudflareAccess, getDevice, getPrivateKey, savePrivateKey } from '@/lib/storage';
import { getSession } from '@/state/session';

/** `serverConfig`: go to /update-server-config to scan the PC's server-config QR code (1100). */
export type StartupOutcome = 'welcome' | 'notRegistered' | 'unreachable' | 'serverConfig';

/** Run start-up once. Retry calls it again. */
export async function runStartup(): Promise<StartupOutcome> {
  try {
    return await startup();
  } catch (error) {
    return outcomeOf(error);
  }
}

/**
 * Cloudflare refused: the stored service token doesn't work, scan a new one.
 * A 4xx means the server answered and doesn't accept this device: register.
 * Anything else (network error, timeout, 5xx, no server URL) is "unreachable": Retry may
 * help, registering wouldn't.
 */
function outcomeOf(error: unknown): StartupOutcome {
  if (error instanceof CloudflareRefusedError) return 'serverConfig';
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return 'notRegistered';
  return 'unreachable';
}

async function startup(): Promise<StartupOutcome> {
  const [device, access] = await Promise.all([getDevice(), getCloudflareAccess()]);
  setCloudflareAccess(access);

  // A new phone (or one the server forgot), or one without the tunnel's token, scans the PC's
  // server-config code first, unless it already did in this launch.
  if (!isServerConfigDone() && (!device || (!access && CLOUDFLARE_ACCESS_REQUIRED))) {
    return 'serverConfig';
  }

  // Every launch checks the server first: a refused token goes back to the server config.
  await checkHealth();
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
