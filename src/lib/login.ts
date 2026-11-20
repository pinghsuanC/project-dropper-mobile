// The log-in steps start-up and Register share (context/details/1010, 1050):
// challenge → sign → verify-challenge gives a session token; /auth/me then checks it and
// gives the server's device name. The token lives in the session only, never in storage.
import { getMe, requestChallenge, verifyChallenge } from '@/api/auth';
import { deviceFingerprint, signChallenge } from '@/lib/crypto';
import { getSession, type Identity } from '@/state/session';

/**
 * Sign a challenge and trade it for a session token (`POST /auth/verify-challenge`), with the
 * same device fingerprint register sent: the server checks it before the signature.
 */
export async function answerChallenge(deviceId: string, challenge: string, privateKey: Uint8Array): Promise<string> {
  const signature = await signChallenge(challenge, privateKey);
  return verifyChallenge(deviceId, challenge, signature, deviceFingerprint());
}

/** challenge → sign → verify. Errors (a 404 on the challenge too) are passed on. */
export async function logIn(deviceId: string, privateKey: Uint8Array): Promise<string> {
  const challenge = await requestChallenge(deviceId);
  return answerChallenge(deviceId, challenge, privateKey);
}

/**
 * Keep the token, check it with `GET /auth/me`, and set the identity with the server's device
 * name. If /auth/me fails, the token is cleared and the error passed on.
 */
export async function startSession({ deviceId, userName }: Omit<Identity, 'deviceName'>, token: string): Promise<void> {
  const session = getSession();
  session.setToken(token);
  try {
    const me = await getMe();
    session.setIdentity({ deviceId, userName, deviceName: me.name });
  } catch (error) {
    session.setToken(null); // the server didn't accept it: don't keep it around
    throw error;
  }
}
