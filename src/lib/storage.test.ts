import * as SecureStore from 'expo-secure-store';

import { STORAGE_KEYS } from '@/constants/config';
import {
  clearCloudflareAccess,
  clearDevice,
  deleteDeviceId,
  getCloudflareAccess,
  getDevice,
  getPrivateKey,
  saveCloudflareAccess,
  saveDevice,
  savePrivateKey,
} from '@/lib/storage';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
});

describe('device record', () => {
  it('returns null when there is no device_id', async () => {
    expect(await getDevice()).toBeNull();
  });

  it('returns null when only names are stored', async () => {
    store.set(STORAGE_KEYS.userName, 'Ping');
    expect(await getDevice()).toBeNull();
  });

  it('round trips device_id and both names', async () => {
    await saveDevice({ deviceId: 'abc-123', userName: 'Ping', deviceName: 'Pixel' });
    expect(await getDevice()).toEqual({ deviceId: 'abc-123', userName: 'Ping', deviceName: 'Pixel' });
  });

  it('returns null names when only device_id is stored', async () => {
    store.set(STORAGE_KEYS.deviceId, 'abc-123');
    expect(await getDevice()).toEqual({ deviceId: 'abc-123', userName: null, deviceName: null });
  });

  it('clearDevice removes the device_id, names and private key', async () => {
    await savePrivateKey(new Uint8Array(32).fill(7));
    await saveDevice({ deviceId: 'abc-123', userName: 'Ping', deviceName: 'Pixel' });
    await clearDevice();
    expect(await getDevice()).toBeNull();
    expect(store.has(STORAGE_KEYS.userName)).toBe(false);
    expect(store.has(STORAGE_KEYS.deviceName)).toBe(false);
    expect(await getPrivateKey()).toBeNull();
  });
});

describe('private key', () => {
  it('returns null when none is stored', async () => {
    expect(await getPrivateKey()).toBeNull();
  });

  it('round trips the 32 key bytes', async () => {
    const key = Uint8Array.from({ length: 32 }, (_, i) => i * 7);
    await savePrivateKey(key);
    expect(await getPrivateKey()).toEqual(key);
  });

  it('is never part of the device record', async () => {
    await savePrivateKey(new Uint8Array(32).fill(1));
    await saveDevice({ deviceId: 'abc-123', userName: 'Ping', deviceName: 'Pixel' });
    expect(Object.keys((await getDevice())!)).toEqual(['deviceId', 'userName', 'deviceName']);
  });
});

it('only ever writes the known storage keys (no session token)', async () => {
  await savePrivateKey(new Uint8Array(32));
  await saveDevice({ deviceId: 'abc-123', userName: 'Ping', deviceName: 'Pixel' });
  await saveCloudflareAccess({ clientId: 'id', accessKey: 'key' });
  const written = (SecureStore.setItemAsync as jest.Mock).mock.calls.map(([key]) => key);
  expect(written.sort()).toEqual(Object.values(STORAGE_KEYS).sort());
  expect(written.some((key: string) => /token/i.test(key))).toBe(false);
});

describe('device_id only', () => {
  it('deleteDeviceId removes only the device_id', async () => {
    await savePrivateKey(new Uint8Array(32).fill(3));
    await saveDevice({ deviceId: 'abc-123', userName: 'Ping', deviceName: 'Pixel' });
    await deleteDeviceId();
    expect(await getDevice()).toBeNull();
    expect(store.get(STORAGE_KEYS.userName)).toBe('Ping');
    expect(store.get(STORAGE_KEYS.deviceName)).toBe('Pixel');
    expect(await getPrivateKey()).toEqual(new Uint8Array(32).fill(3));
  });
});

describe('Cloudflare Access values (1100)', () => {
  const ACCESS = { clientId: 'id.access', accessKey: 'cf-secret' };

  it('returns null when none are stored', async () => {
    expect(await getCloudflareAccess()).toBeNull();
  });

  it('saves both under their own keys and reads them back', async () => {
    await saveCloudflareAccess(ACCESS);
    expect(store.get(STORAGE_KEYS.cloudflareClientId)).toBe('id.access');
    expect(store.get(STORAGE_KEYS.cloudflareAccessKey)).toBe('cf-secret');
    expect(await getCloudflareAccess()).toEqual(ACCESS);
  });

  it.each([
    ['the client id', 'cloudflareClientId'],
    ['the access key', 'cloudflareAccessKey'],
  ] as const)('returns null when %s is missing', async (_label, key) => {
    await saveCloudflareAccess(ACCESS);
    store.delete(STORAGE_KEYS[key]);
    expect(await getCloudflareAccess()).toBeNull();
  });

  it('clearCloudflareAccess removes both', async () => {
    await saveCloudflareAccess(ACCESS);
    await clearCloudflareAccess();
    expect(store.has(STORAGE_KEYS.cloudflareClientId)).toBe(false);
    expect(store.has(STORAGE_KEYS.cloudflareAccessKey)).toBe(false);
  });

  it('clearDevice keeps them: they belong to the tunnel, not the registration', async () => {
    await saveCloudflareAccess(ACCESS);
    await saveDevice({ deviceId: 'abc-123', userName: 'Ping', deviceName: 'Pixel' });
    await clearDevice();
    expect(await getCloudflareAccess()).toEqual(ACCESS);
  });
});
