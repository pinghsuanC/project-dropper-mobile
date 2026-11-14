import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

import { deviceFingerprint, generateKeyPair, publicKeyToPem, signChallenge } from '@/lib/crypto';

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n))),
}));
jest.mock('expo-application', () => ({ getAndroidId: jest.fn(() => 'dd96dec43fb81c97') }));

ed.hashes.sha512 = sha512;

const SPKI_PREFIX = Uint8Array.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]);
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const randomBytes = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

describe('generateKeyPair', () => {
  it('returns a 32-byte private key and its matching public key', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    expect(privateKey).toHaveLength(32);
    expect(publicKey).toEqual(ed.getPublicKey(privateKey));
  });

  it('returns a new key each time', async () => {
    const a = await generateKeyPair();
    const b = await generateKeyPair();
    expect(a.privateKey).not.toEqual(b.privateKey);
  });
});

describe('publicKeyToPem', () => {
  const raw = randomBytes(32);
  const pem = publicKeyToPem(raw);

  it('has the PUBLIC KEY header and footer', () => {
    expect(pem.startsWith('-----BEGIN PUBLIC KEY-----\n')).toBe(true);
    expect(pem.endsWith('\n-----END PUBLIC KEY-----\n')).toBe(true);
  });

  it('holds the 44-byte SubjectPublicKeyInfo: Ed25519 prefix + raw key', () => {
    const body = pem.split('\n')[1];
    const der = fromBase64(body);
    expect(der).toHaveLength(44);
    expect(der.slice(0, 12)).toEqual(SPKI_PREFIX);
    expect(der.slice(12)).toEqual(raw);
  });
});

describe('signChallenge', () => {
  const challenge = toBase64(randomBytes(32));

  it('signs the challenge string as UTF-8 and returns base64', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    const signature = await signChallenge(challenge, privateKey);
    const sigBytes = fromBase64(signature);
    expect(sigBytes).toHaveLength(64);
    expect(ed.verify(sigBytes, new TextEncoder().encode(challenge), publicKey)).toBe(true);
  });

  it('does not sign the base64-decoded challenge', async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    const sigBytes = fromBase64(await signChallenge(challenge, privateKey));
    expect(ed.verify(sigBytes, fromBase64(challenge), publicKey)).toBe(false);
  });
});

describe('deviceFingerprint', () => {
  it('is the lowercase SHA-256 hex of the Android ID', () => {
    // Known SHA-256 of 'dd96dec43fb81c97', computed outside the app.
    const expected = '9d2e6e6891dd1bbe2119e1f12c1d81e220b8da14a64f68f83dddd8e6fc6769a0';
    expect(deviceFingerprint()).toBe(expected);
    expect(deviceFingerprint()).toMatch(/^[0-9a-f]{64}$/);
  });
});
