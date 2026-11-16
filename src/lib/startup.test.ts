// The 1010 start-up order, end to end through the real storage, crypto and API client.
// Only the edges are mocked: expo-secure-store, fetch, the Android ID and random bytes.
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import * as SecureStore from 'expo-secure-store';

import { apiBaseUrl, STORAGE_KEYS } from '@/constants/config';
import { runStartup } from '@/lib/startup';
import { getDevice, getPrivateKey, saveDevice, savePrivateKey } from '@/lib/storage';
import { getSession } from '@/state/session';

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
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n))),
}));
jest.mock('expo-application', () => ({ getAndroidId: jest.fn(() => 'dd96dec43fb81c97') }));
jest.mock('@/constants/config', () => ({
  ...jest.requireActual('@/constants/config'),
  apiBaseUrl: jest.fn(() => 'http://server.test:8000'),
}));

ed.hashes.sha512 = sha512;

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const CHALLENGE = 'Y2hhbGxlbmdlLWJ5dGVz';

// --- fake server -------------------------------------------------------------------------

type Reply = { status: number; body?: unknown } | 'network';
type Call = { path: string; method: string; body: unknown; auth: string | undefined };

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;
let replies: Record<string, Reply[]> = {};
let calls: Call[] = [];

const ok = (data: unknown, status = 200): Reply => ({ status, body: { message: 'ok', data } });
const fail = (status: number): Reply => ({ status, body: { detail: `failed ${status}` } });

function reply(path: string, ...answers: Reply[]) {
  (replies[path] ??= []).push(...answers);
}

const paths = () => calls.map((c) => c.path);

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
  getSession().reset();
  replies = {};
  calls = [];
  fetchMock.mockImplementation(async (url: string, init: RequestInit & { headers: Record<string, string> }) => {
    const path = url.replace('http://server.test:8000', '');
    calls.push({
      path,
      method: init.method ?? 'GET',
      body: init.body === undefined ? undefined : JSON.parse(init.body as string),
      auth: init.headers.Authorization,
    });
    const answer = replies[path]?.shift();
    if (answer === undefined) throw new Error(`unexpected call to ${path}`);
    if (answer === 'network') throw new TypeError('Network request failed');
    return { ok: answer.status < 300, status: answer.status, json: async () => answer.body };
  });
});

// --- stored device -----------------------------------------------------------------------

let privateKey: Uint8Array;
let publicKey: Uint8Array;

async function storeDevice(names: { userName?: string | null; deviceName?: string | null } = {}) {
  privateKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
  publicKey = ed.getPublicKey(privateKey);
  await savePrivateKey(privateKey);
  const userName = names.userName === undefined ? 'Ping' : names.userName;
  const deviceName = names.deviceName === undefined ? 'Pixel' : names.deviceName;
  await saveDevice({ deviceId: 'dev-1', userName: userName ?? '', deviceName: deviceName ?? '' });
  if (userName === null) store.delete(STORAGE_KEYS.userName);
  if (deviceName === null) store.delete(STORAGE_KEYS.deviceName);
  jest.clearAllMocks(); // count only what start-up itself reads and writes
}

/** The happy login for `deviceId`: challenge, verify, /auth/me. */
function replyLogin(deviceId = 'dev-1', name = 'Pixel (server)') {
  reply('/auth/challenge', ok({ challenge: CHALLENGE }));
  reply('/auth/verify-challenge', ok({ token: `token-for-${deviceId}` }));
  reply('/auth/me', ok({ device_id: deviceId, name, platform: 'android' }));
}

const writtenValues = () => (SecureStore.setItemAsync as jest.Mock).mock.calls.map(([, value]) => value);

// --- tests -------------------------------------------------------------------------------

describe('no stored device', () => {
  it('→ notRegistered without calling the server', async () => {
    expect(await runStartup()).toBe('notRegistered');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getSession().deviceId).toBeNull();
  });
});

describe('device_id but no private key', () => {
  beforeEach(async () => {
    await saveDevice({ deviceId: 'dev-1', userName: 'Ping', deviceName: 'Pixel' });
    jest.clearAllMocks();
  });

  it('→ notRegistered without calling the server', async () => {
    expect(await runStartup()).toBe('notRegistered');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves a new private key and deletes only the device_id', async () => {
    await runStartup();
    expect(await getPrivateKey()).toHaveLength(32);
    expect(await getDevice()).toBeNull();
    expect(store.get(STORAGE_KEYS.userName)).toBe('Ping');
    expect(store.get(STORAGE_KEYS.deviceName)).toBe('Pixel');
  });
});

describe('successful login', () => {
  beforeEach(async () => {
    await storeDevice();
    replyLogin();
  });

  it('→ welcome, after challenge → verify → /auth/me', async () => {
    expect(await runStartup()).toBe('welcome');
    expect(paths()).toEqual(['/auth/challenge', '/auth/verify-challenge', '/auth/me']);
  });

  it('sends the device_id, then a signature of the challenge string', async () => {
    await runStartup();
    expect(calls[0].body).toEqual({ device_id: 'dev-1' });
    const verify = calls[1].body as { device_id: string; challenge: string; signature: string };
    expect(verify.device_id).toBe('dev-1');
    expect(verify.challenge).toBe(CHALLENGE);
    const signature = Uint8Array.from(atob(verify.signature), (c) => c.charCodeAt(0));
    expect(ed.verify(signature, new TextEncoder().encode(CHALLENGE), publicKey)).toBe(true);
  });

  it('calls /auth/me with the new token; never sends it to the auth routes', async () => {
    await runStartup();
    expect(calls[0].auth).toBeUndefined();
    expect(calls[1].auth).toBeUndefined();
    expect(calls[2]).toMatchObject({ method: 'GET', auth: 'Bearer token-for-dev-1' });
  });

  it('fills the session: identity, the server device name, the token', async () => {
    await runStartup();
    const session = getSession();
    expect(session.deviceId).toBe('dev-1');
    expect(session.userName).toBe('Ping');
    expect(session.deviceName).toBe('Pixel (server)');
    expect(session.token).toBe('token-for-dev-1');
  });

  it('keeps pairedWith null and the default quote', async () => {
    const quote = getSession().quote;
    await runStartup();
    expect(getSession().pairedWith).toBeNull();
    expect(getSession().quote).toEqual(quote);
  });

  it('reads each storage key once and never stores the token', async () => {
    await runStartup();
    const reads = (SecureStore.getItemAsync as jest.Mock).mock.calls.map(([key]) => key);
    expect(reads.sort()).toEqual(Object.values(STORAGE_KEYS).sort());
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(store.get(STORAGE_KEYS.deviceName)).toBe('Pixel'); // server name: session only
  });
});

it('a missing user name still logs in, with a null user name', async () => {
  await storeDevice({ userName: null });
  replyLogin();
  expect(await runStartup()).toBe('welcome');
  expect(getSession().userName).toBeNull();
});

describe('challenge 404: the server forgot this phone (decided 2026-11-16)', () => {
  beforeEach(async () => {
    await storeDevice();
    reply('/auth/challenge', fail(404));
  });

  it('→ notRegistered, with no register and no other call', async () => {
    expect(await runStartup()).toBe('notRegistered');
    expect(paths()).toEqual(['/auth/challenge']);
  });

  it('deletes the device_id, both names and the private key', async () => {
    await runStartup();
    await expect(getDevice()).resolves.toBeNull();
    await expect(getPrivateKey()).resolves.toBeNull();
    for (const key of Object.values(STORAGE_KEYS)) expect(store.has(key)).toBe(false);
  });

  it('clears the identity it had put in the session', async () => {
    await runStartup();
    expect(getSession()).toMatchObject({ deviceId: null, userName: null, deviceName: null, token: null });
  });

  it('a later start-up goes straight to Register, calling nothing', async () => {
    await runStartup();
    calls = [];
    expect(await runStartup()).toBe('notRegistered');
    expect(calls).toEqual([]);
  });
});

it('only a 404 wipes the phone: a 403 (revoked) keeps the stored device', async () => {
  await storeDevice();
  reply('/auth/challenge', fail(403));
  expect(await runStartup()).toBe('notRegistered');
  await expect(getDevice()).resolves.toMatchObject({ deviceId: 'dev-1' });
  await expect(getPrivateKey()).resolves.not.toBeNull();
});

describe('notRegistered from the server', () => {
  beforeEach(() => storeDevice());

  it.each([403, 422])('challenge %i', async (status) => {
    reply('/auth/challenge', fail(status));
    expect(await runStartup()).toBe('notRegistered');
  });

  it.each([401, 403, 422])('verify %i', async (status) => {
    reply('/auth/challenge', ok({ challenge: CHALLENGE }));
    reply('/auth/verify-challenge', fail(status));
    expect(await runStartup()).toBe('notRegistered');
    expect(getSession().token).toBeNull();
  });

  it.each([401, 403])('/auth/me %i, and the token is cleared', async (status) => {
    reply('/auth/challenge', ok({ challenge: CHALLENGE }));
    reply('/auth/verify-challenge', ok({ token: 'tok' }));
    reply('/auth/me', fail(status));
    expect(await runStartup()).toBe('notRegistered');
    expect(getSession().token).toBeNull();
  });
});

describe('unreachable', () => {
  beforeEach(() => storeDevice());

  it('network error on challenge', async () => {
    reply('/auth/challenge', 'network');
    expect(await runStartup()).toBe('unreachable');
  });

  it.each([500, 503])('challenge %i', async (status) => {
    reply('/auth/challenge', fail(status));
    expect(await runStartup()).toBe('unreachable');
  });

  it('network error on verify', async () => {
    reply('/auth/challenge', ok({ challenge: CHALLENGE }));
    reply('/auth/verify-challenge', 'network');
    expect(await runStartup()).toBe('unreachable');
  });

  it('5xx on challenge: unreachable, and the stored device is kept (only a 404 wipes it)', async () => {
    reply('/auth/challenge', fail(500));
    expect(await runStartup()).toBe('unreachable');
    await expect(getDevice()).resolves.toMatchObject({ deviceId: 'dev-1' });
    await expect(getPrivateKey()).resolves.not.toBeNull();
  });

  it('5xx on /auth/me, and the token is cleared', async () => {
    reply('/auth/challenge', ok({ challenge: CHALLENGE }));
    reply('/auth/verify-challenge', ok({ token: 'tok' }));
    reply('/auth/me', fail(500));
    expect(await runStartup()).toBe('unreachable');
    expect(getSession().token).toBeNull();
  });

  it('missing server URL: no crash, no call', async () => {
    (apiBaseUrl as jest.Mock).mockImplementationOnce(() => {
      throw new Error('EXPO_PUBLIC_API_BASE_URL is not set');
    });
    expect(await runStartup()).toBe('unreachable');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

it('a normal login writes nothing to storage (the token stays in memory)', async () => {
  await storeDevice();
  replyLogin('dev-1');
  expect(await runStartup()).toBe('welcome');
  expect(writtenValues()).toEqual([]);
});
