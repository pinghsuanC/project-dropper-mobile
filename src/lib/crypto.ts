// Device identity crypto (CLAUDE.md "Crypto rules", context/details/1010).
// Never log, print or send the private key.
import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

// Hermes has no WebCrypto, so give noble its SHA-512 directly (sync and async paths).
ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (message: Uint8Array) => sha512(message);

export type KeyPair = { privateKey: Uint8Array; publicKey: Uint8Array };

/** DER prefix of an Ed25519 SubjectPublicKeyInfo; the 32 raw key bytes follow it. */
const ED25519_SPKI_PREFIX = Uint8Array.from([
  0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
]);

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** A new key pair. The private key is 32 random bytes from the OS's secure random source. */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = await Crypto.getRandomBytesAsync(32);
  return { privateKey, publicKey: await publicKeyFor(privateKey) };
}

/** The public key that belongs to a stored private key (e.g. Register reusing a stored key). */
export async function publicKeyFor(privateKey: Uint8Array): Promise<Uint8Array> {
  return ed.getPublicKeyAsync(privateKey);
}

/** The raw 32-byte public key as PEM SubjectPublicKeyInfo, the only form the server accepts. */
export function publicKeyToPem(publicKey: Uint8Array): string {
  const der = new Uint8Array(ED25519_SPKI_PREFIX.length + publicKey.length);
  der.set(ED25519_SPKI_PREFIX);
  der.set(publicKey, ED25519_SPKI_PREFIX.length);
  return `-----BEGIN PUBLIC KEY-----\n${toBase64(der)}\n-----END PUBLIC KEY-----\n`;
}

/** Sign the challenge string exactly as UTF-8 (never base64-decoded); base64 signature. */
export async function signChallenge(challenge: string, privateKey: Uint8Array): Promise<string> {
  const signature = await ed.signAsync(utf8ToBytes(challenge), privateKey);
  return toBase64(signature);
}

/** Lowercase hex SHA-256 of the Android ID (Android only). */
export function deviceFingerprint(): string {
  return bytesToHex(sha256(utf8ToBytes(Application.getAndroidId())));
}

/**
 * The upload `checksum`: lowercase hex SHA-256 of the file's bytes (64 chars). Hashed natively
 * by expo-file-system in small reads, so a 100 MB file never sits in JS memory.
 */
export async function fileChecksum(uri: string): Promise<string> {
  const digest = (await new File(uri).digest('SHA-256')).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error('Not a SHA-256 digest');
  return digest;
}
