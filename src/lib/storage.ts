// Everything the app keeps across restarts (context/details/1010), all in expo-secure-store.
// The session token is never stored: there is deliberately no function for it.
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import * as SecureStore from 'expo-secure-store';

import type { CloudflareAccess } from '@/api/types';
import { STORAGE_KEYS } from '@/constants/config';

/** The stored device record. Names can be missing even when the device_id isn't. */
export type StoredDevice = {
  deviceId: string;
  userName: string | null;
  deviceName: string | null;
};

export type DeviceToSave = { deviceId: string; userName: string; deviceName: string };

/** The device record, or null when this phone has no device_id yet. */
export async function getDevice(): Promise<StoredDevice | null> {
  const deviceId = await SecureStore.getItemAsync(STORAGE_KEYS.deviceId);
  if (!deviceId) return null;
  const [userName, deviceName] = await Promise.all([
    SecureStore.getItemAsync(STORAGE_KEYS.userName),
    SecureStore.getItemAsync(STORAGE_KEYS.deviceName),
  ]);
  return { deviceId, userName, deviceName };
}

export async function saveDevice({ deviceId, userName, deviceName }: DeviceToSave): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(STORAGE_KEYS.deviceId, deviceId),
    SecureStore.setItemAsync(STORAGE_KEYS.userName, userName),
    SecureStore.setItemAsync(STORAGE_KEYS.deviceName, deviceName),
  ]);
}

/**
 * Forget the device_id, names and private key (after unregister). The server keeps the
 * revoked row with this public key, so registering again needs a new key (else 409).
 */
export async function clearDevice(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(STORAGE_KEYS.deviceId),
    SecureStore.deleteItemAsync(STORAGE_KEYS.userName),
    SecureStore.deleteItemAsync(STORAGE_KEYS.deviceName),
    SecureStore.deleteItemAsync(STORAGE_KEYS.privateKey),
  ]);
}

/** The Ed25519 private key (32 bytes), or null before the first key is made. Only read to sign. */
export async function getPrivateKey(): Promise<Uint8Array | null> {
  const hex = await SecureStore.getItemAsync(STORAGE_KEYS.privateKey);
  return hex ? hexToBytes(hex) : null;
}

export async function savePrivateKey(privateKey: Uint8Array): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.privateKey, bytesToHex(privateKey));
}

/** Forget only the device_id (its key is gone); names and key stay. */
export async function deleteDeviceId(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.deviceId);
}


/**
 * The Cloudflare Access service token (1100), or null unless both values are stored. Kept apart
 * from the device: clearDevice() leaves it, as it belongs to the tunnel, not the registration.
 */
export async function getCloudflareAccess(): Promise<CloudflareAccess | null> {
  const [clientId, accessKey] = await Promise.all([
    SecureStore.getItemAsync(STORAGE_KEYS.cloudflareClientId),
    SecureStore.getItemAsync(STORAGE_KEYS.cloudflareAccessKey),
  ]);
  return clientId && accessKey ? { clientId, accessKey } : null;
}

export async function saveCloudflareAccess({ clientId, accessKey }: CloudflareAccess): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(STORAGE_KEYS.cloudflareClientId, clientId),
    SecureStore.setItemAsync(STORAGE_KEYS.cloudflareAccessKey, accessKey),
  ]);
}

export async function clearCloudflareAccess(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(STORAGE_KEYS.cloudflareClientId),
    SecureStore.deleteItemAsync(STORAGE_KEYS.cloudflareAccessKey),
  ]);
}
