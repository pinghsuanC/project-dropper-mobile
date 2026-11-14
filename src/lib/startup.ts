// The start-up order Landing runs (context/details/1010): read the stored device, log in
// with a signed challenge, check the session with /auth/me, and fill the session.
// Returns an outcome for Landing to show; it never throws.
import { getMe, registerDevice, requestChallenge, verifyChallenge } from '@/api/auth';
import { ApiError } from '@/api/client';
import { deviceFingerprint, generateKeyPair, publicKeyFor, publicKeyToPem, signChallenge } from '@/lib/crypto';
import { deleteDeviceId, getDevice, getPrivateKey, saveDeviceId, savePrivateKey, type StoredDevice } from '@/lib/storage';
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

  const session = getSession();
  session.setIdentity(device);

  const loggedIn = await logIn(device, privateKey);
  if (!loggedIn) return 'notRegistered';
  const { deviceId, token } = loggedIn;

  session.setToken(token);
  try {
    const me = await getMe();
    session.setIdentity({ deviceId, userName: device.userName, deviceName: me.name });
  } catch (error) {
    session.setToken(null); // the server didn't accept it: don't keep it around
    throw error;
  }
  return 'welcome';
}

/** challenge → sign → verify. On a 404, register again once with the stored key. */
async function logIn(
  device: StoredDevice,
  privateKey: Uint8Array,
): Promise<{ deviceId: string; token: string } | null> {
  let deviceId = device.deviceId;
  let challenge: string;
  try {
    challenge = await requestChallenge(deviceId);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
    // The server forgot this device. Register again needs the device name it's known by.
    if (!device.deviceName) return null;
    deviceId = await registerDevice({
      name: device.deviceName,
      publicKey: publicKeyToPem(await publicKeyFor(privateKey)),
      fingerprint: deviceFingerprint(),
    });
    await saveDeviceId(deviceId);
    getSession().setIdentity({ ...device, deviceId });
    challenge = await requestChallenge(deviceId); // a second 404 is a 4xx → notRegistered
  }
  const signature = await signChallenge(challenge, privateKey);
  const token = await verifyChallenge(deviceId, challenge, signature);
  return { deviceId, token };
}
