// Keeping a scanned server config (context/details/1100): GET /health with the scanned values
// first, and only a working config is saved. The API client is mocked; storage is real.
import * as SecureStore from 'expo-secure-store';

import { setCloudflareAccess } from '@/api/apiHeaders';
import { checkHealth, CloudflareRefusedError, UnreachableError } from '@/api/client';
import { STORAGE_KEYS } from '@/constants/config';
import { applyServerConfig, isServerConfigDone, markServerConfigDone, resetServerConfigDone } from '@/lib/serverConfig';
import { getCloudflareAccess, saveCloudflareAccess } from '@/lib/storage';

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
jest.mock('@/api/client', () => {
  const actual = jest.requireActual('@/api/client');
  return { ...actual, checkHealth: jest.fn() };
});
jest.mock('@/api/apiHeaders', () => ({
  ...jest.requireActual('@/api/apiHeaders'),
  setCloudflareAccess: jest.fn(),
}));

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const checkHealthMock = jest.mocked(checkHealth);
const OLD = { clientId: 'old-id', accessKey: 'old-key' };
const NEW = { clientId: 'new-id', accessKey: 'new-key' };

beforeEach(async () => {
  store.clear();
  jest.clearAllMocks();
  resetServerConfigDone();
  checkHealthMock.mockResolvedValue(undefined);
  await saveCloudflareAccess(OLD);
});

describe('a config that works', () => {
  it('checks /health with the scanned values, before saving anything', async () => {
    checkHealthMock.mockImplementationOnce(async () => {
      expect(store.get(STORAGE_KEYS.cloudflareClientId)).toBe('old-id');
    });
    expect(await applyServerConfig({ kind: 'tunnel', access: NEW })).toBe('ok');
    expect(checkHealthMock).toHaveBeenCalledWith(NEW);
  });

  it('saves the values, hands them to the client and marks the config done', async () => {
    await applyServerConfig({ kind: 'tunnel', access: NEW });
    expect(await getCloudflareAccess()).toEqual(NEW);
    expect(setCloudflareAccess).toHaveBeenCalledWith(NEW);
    expect(isServerConfigDone()).toBe(true);
  });

  it('"no tunnel" checks without headers and clears the stored values', async () => {
    expect(await applyServerConfig({ kind: 'noTunnel' })).toBe('ok');
    expect(checkHealthMock).toHaveBeenCalledWith(null);
    expect(await getCloudflareAccess()).toBeNull();
    expect(setCloudflareAccess).toHaveBeenCalledWith(null);
  });
});

describe('a config that fails', () => {
  it.each([
    ['refused', new CloudflareRefusedError(403)],
    ['unreachable', new UnreachableError()],
  ] as const)('→ %s, and nothing changes', async (result, error) => {
    checkHealthMock.mockRejectedValueOnce(error);
    expect(await applyServerConfig({ kind: 'tunnel', access: NEW })).toBe(result);
    expect(await getCloudflareAccess()).toEqual(OLD);
    expect(setCloudflareAccess).not.toHaveBeenCalled();
    expect(isServerConfigDone()).toBe(false);
  });

  it('a 503 (database down) is unreachable', async () => {
    const { ApiError } = jest.requireActual('@/api/client');
    checkHealthMock.mockRejectedValueOnce(new ApiError(503, 'database unavailable'));
    expect(await applyServerConfig({ kind: 'tunnel', access: NEW })).toBe('unreachable');
  });

  it('secure storage failing → saveFailed (the server was fine), and the config is not marked done', async () => {
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keystore'));
    expect(await applyServerConfig({ kind: 'tunnel', access: NEW })).toBe('saveFailed');
    expect(setCloudflareAccess).not.toHaveBeenCalled();
    expect(isServerConfigDone()).toBe(false);
  });
});

it('the done flag lasts until reset (a new launch)', () => {
  markServerConfigDone();
  expect(isServerConfigDone()).toBe(true);
  resetServerConfigDone();
  expect(isServerConfigDone()).toBe(false);
});
