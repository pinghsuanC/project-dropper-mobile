// The log-in steps start-up and Register share (context/details/1010, 1050).
import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

import { getMe, requestChallenge, verifyChallenge } from '@/api/auth';
import { ApiError } from '@/api/client';
import { answerChallenge, logIn, startSession } from '@/lib/login';
import { getSession } from '@/state/session';

jest.mock('@/api/auth', () => ({
  requestChallenge: jest.fn(),
  verifyChallenge: jest.fn(),
  getMe: jest.fn(),
}));
jest.mock('expo-crypto', () => ({ getRandomBytesAsync: jest.fn() }));
jest.mock('expo-application', () => ({ getAndroidId: jest.fn(() => 'android-id') }));

ed.hashes.sha512 = sha512;

const CHALLENGE = 'Y2hhbGxlbmdlLWJ5dGVz';
const privateKey = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const publicKey = ed.getPublicKey(privateKey);
// The fingerprint register sends: SHA-256 hex of the (mocked) Android ID.
const FINGERPRINT = bytesToHex(sha256(utf8ToBytes('android-id')));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

beforeEach(() => {
  jest.clearAllMocks();
  getSession().reset();
  jest.mocked(requestChallenge).mockResolvedValue(CHALLENGE);
  jest.mocked(verifyChallenge).mockResolvedValue('token-1');
  jest.mocked(getMe).mockResolvedValue({ device_id: 'dev-1', name: 'Pixel (server)', platform: 'android' });
});

describe('answerChallenge', () => {
  it('signs the challenge string itself as UTF-8 and returns the token', async () => {
    await expect(answerChallenge('dev-1', CHALLENGE, privateKey)).resolves.toBe('token-1');
    const [deviceId, challenge, signature, fingerprint] = jest.mocked(verifyChallenge).mock.calls[0];
    expect([deviceId, challenge]).toEqual(['dev-1', CHALLENGE]);
    expect(fingerprint).toBe(FINGERPRINT);
    expect(ed.verify(fromBase64(signature), utf8ToBytes(CHALLENGE), publicKey)).toBe(true);
  });
});

describe('logIn', () => {
  it('asks for a challenge for this device, answers it and returns the token', async () => {
    await expect(logIn('dev-1', privateKey)).resolves.toBe('token-1');
    expect(requestChallenge).toHaveBeenCalledWith('dev-1');
    const [deviceId, challenge, , fingerprint] = jest.mocked(verifyChallenge).mock.calls[0];
    expect([deviceId, challenge, fingerprint]).toEqual(['dev-1', CHALLENGE, FINGERPRINT]);
  });

  it('passes a challenge error on (e.g. 404)', async () => {
    jest.mocked(requestChallenge).mockRejectedValue(new ApiError(404, 'unknown device'));
    await expect(logIn('dev-1', privateKey)).rejects.toMatchObject({ status: 404 });
    expect(verifyChallenge).not.toHaveBeenCalled();
  });
});

describe('startSession', () => {
  it('keeps the token, checks it with /auth/me and sets the identity with the server name', async () => {
    let tokenDuringMe: string | null = null;
    jest.mocked(getMe).mockImplementation(async () => {
      tokenDuringMe = getSession().token;
      return { device_id: 'dev-1', name: 'Pixel (server)', platform: 'android' };
    });
    await startSession({ deviceId: 'dev-1', userName: 'Alex' }, 'token-1');
    expect(tokenDuringMe).toBe('token-1');
    expect(getSession()).toMatchObject({
      token: 'token-1',
      deviceId: 'dev-1',
      userName: 'Alex',
      deviceName: 'Pixel (server)',
    });
  });

  it('clears the token and passes the error on when /auth/me fails', async () => {
    jest.mocked(getMe).mockRejectedValue(new ApiError(401, 'expired'));
    await expect(startSession({ deviceId: 'dev-1', userName: 'Alex' }, 'token-1')).rejects.toMatchObject({ status: 401 });
    expect(getSession().token).toBeNull();
  });
});
