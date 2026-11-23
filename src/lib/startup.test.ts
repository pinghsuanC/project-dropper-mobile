// The 1010 start-up order, end to end through the real storage, crypto and API client:
// the server-config check (1100), GET /health, then the log-in.
// Only the edges are mocked: expo-secure-store, fetch, the Android ID and random bytes.
import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import * as SecureStore from 'expo-secure-store';

import { setCloudflareAccess } from '@/api/client';
import { apiBaseUrl, STORAGE_KEYS } from '@/constants/config';
import { markServerConfigDone, resetServerConfigDone } from '@/lib/serverConfig';
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
// CLOUDFLARE_ACCESS_REQUIRED is fixed at import (false only on APP_ENV local): a getter lets a
// test switch it.
let mockTunnelRequired = true;
jest.mock('@/constants/config', () =>
  Object.defineProperty(
    { ...jest.requireActual('@/constants/config'), apiBaseUrl: jest.fn(() => 'http://server.test:8000') },
    'CLOUDFLARE_ACCESS_REQUIRED',
    { get: () => mockTunnelRequired },
  ),
);

ed.hashes.sha512 = sha512;

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const CHALLENGE = 'Y2hhbGxlbmdlLWJ5dGVz';
// What register sent: SHA-256 hex of the mocked Android ID.
const FINGERPRINT = bytesToHex(sha256(utf8ToBytes('dd96dec43fb81c97')));

// --- fake server -------------------------------------------------------------------------

/** 'cloudflare': Cloudflare's own 403 page (HTML, not our JSON). */
type Reply = { status: number; body?: unknown } | 'network' | 'cloudflare';
type Call = { path: string; method: string; body: unknown; auth: string | undefined; cfId: string | undefined };

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
/** The calls after /health: the log-in. */
const loginCalls = () => calls.filter((c) => c.path !== '/health');

const ACCESS = { clientId: 'id.access', accessKey: 'cf-secret' };
const HEALTHY: Reply = { status: 200, body: { status: 'ok' } };
/** /health's answer whenever none is queued with reply('/health', …). */
let health: Reply = HEALTHY;

function storeAccess() {
  store.set(STORAGE_KEYS.cloudflareClientId, ACCESS.clientId);
  store.set(STORAGE_KEYS.cloudflareAccessKey, ACCESS.accessKey);
}

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
  getSession().reset();
  setCloudflareAccess(null);
  resetServerConfigDone();
  mockTunnelRequired = true;
  storeAccess();
  health = HEALTHY;
  replies = {};
  calls = [];
  fetchMock.mockImplementation(async (url: string, init: RequestInit & { headers: Record<string, string> }) => {
    const path = url.replace('http://server.test:8000', '');
    calls.push({
      path,
      method: init.method ?? 'GET',
      body: init.body === undefined ? undefined : JSON.parse(init.body as string),
      auth: init.headers.Authorization,
      cfId: init.headers['CF-Access-Client-Id'],
    });
    const answer = replies[path]?.shift() ?? (path === '/health' ? health : undefined);
    if (answer === undefined) throw new Error(`unexpected call to ${path}`);
    if (answer === 'network') throw new TypeError('Network request failed');
    if (answer === 'cloudflare') {
      return {
        ok: false,
        status: 403,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      };
    }
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

/** The stored device keys, without the Cloudflare values (which outlive the device). */
const DEVICE_KEYS = [STORAGE_KEYS.privateKey, STORAGE_KEYS.deviceId, STORAGE_KEYS.userName, STORAGE_KEYS.deviceName];

/** The happy login for `deviceId`: challenge, verify, /auth/me. */
function replyLogin(deviceId = 'dev-1', name = 'Pixel (server)') {
  reply('/auth/challenge', ok({ challenge: CHALLENGE }));
  reply('/auth/verify-challenge', ok({ token: `token-for-${deviceId}` }));
  reply('/auth/me', ok({ device_id: deviceId, name, platform: 'android' }));
}

const writtenValues = () => (SecureStore.setItemAsync as jest.Mock).mock.calls.map(([, value]) => value);

// --- tests -------------------------------------------------------------------------------

describe('no stored device', () => {
  it('→ serverConfig without calling the server (a new phone scans the server code first)', async () => {
    expect(await runStartup()).toBe('serverConfig');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getSession().deviceId).toBeNull();
  });

  it('once the server config is done in this launch: /health, then notRegistered', async () => {
    markServerConfigDone();
    expect(await runStartup()).toBe('notRegistered');
    expect(paths()).toEqual(['/health']);
  });
});

describe('server config (1100)', () => {
  it('no Cloudflare values stored → serverConfig, calling nothing', async () => {
    store.clear();
    await storeDevice();
    expect(await runStartup()).toBe('serverConfig');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('one value missing counts as none', async () => {
    await storeDevice();
    store.delete(STORAGE_KEYS.cloudflareAccessKey);
    expect(await runStartup()).toBe('serverConfig');
  });

  it('on local (no tunnel) no values is fine: logs in without the headers', async () => {
    mockTunnelRequired = false;
    store.clear();
    await storeDevice();
    replyLogin();
    expect(await runStartup()).toBe('welcome');
    expect(calls.map((c) => c.cfId)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('a missing device_id still goes to serverConfig on local', async () => {
    mockTunnelRequired = false;
    expect(await runStartup()).toBe('serverConfig');
  });
});

describe('GET /health first', () => {
  beforeEach(() => storeDevice());

  it('runs before the challenge, with the stored Cloudflare values on every call', async () => {
    replyLogin();
    expect(await runStartup()).toBe('welcome');
    expect(paths()[0]).toBe('/health');
    expect(calls.map((c) => c.cfId)).toEqual(['id.access', 'id.access', 'id.access', 'id.access']);
  });

  it('refused by Cloudflare → serverConfig, with no log-in', async () => {
    health = 'cloudflare';
    expect(await runStartup()).toBe('serverConfig');
    expect(paths()).toEqual(['/health']);
  });

  it.each([
    ['no answer', 'network' as Reply],
    ['503 (database down)', { status: 503, body: { detail: 'database unavailable' } } as Reply],
  ])('%s → unreachable, with no log-in', async (_label, answer) => {
    health = answer;
    expect(await runStartup()).toBe('unreachable');
    expect(paths()).toEqual(['/health']);
  });

  it('a Cloudflare refusal during log-in → serverConfig, not notRegistered; the device is kept', async () => {
    reply('/auth/challenge', 'cloudflare');
    expect(await runStartup()).toBe('serverConfig');
    await expect(getDevice()).resolves.toMatchObject({ deviceId: 'dev-1' });
  });

  it('the server config done this launch does not skip /health', async () => {
    markServerConfigDone();
    health = 'cloudflare';
    expect(await runStartup()).toBe('serverConfig');
  });
});

describe('device_id but no private key', () => {
  beforeEach(async () => {
    await saveDevice({ deviceId: 'dev-1', userName: 'Ping', deviceName: 'Pixel' });
    jest.clearAllMocks();
  });

  it('→ notRegistered, calling only /health', async () => {
    expect(await runStartup()).toBe('notRegistered');
    expect(paths()).toEqual(['/health']);
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

  it('→ welcome, after /health → challenge → verify → /auth/me', async () => {
    expect(await runStartup()).toBe('welcome');
    expect(paths()).toEqual(['/health', '/auth/challenge', '/auth/verify-challenge', '/auth/me']);
  });

  it('sends the device_id, then a signature of the challenge string', async () => {
    await runStartup();
    expect(loginCalls()[0].body).toEqual({ device_id: 'dev-1' });
    const verify = loginCalls()[1].body as { device_id: string; challenge: string; signature: string; fingerprint: string };
    expect(Object.keys(verify).sort()).toEqual(['challenge', 'device_id', 'fingerprint', 'signature']);
    expect(verify.device_id).toBe('dev-1');
    expect(verify.challenge).toBe(CHALLENGE);
    expect(verify.fingerprint).toBe(FINGERPRINT);
    const signature = Uint8Array.from(atob(verify.signature), (c) => c.charCodeAt(0));
    expect(ed.verify(signature, new TextEncoder().encode(CHALLENGE), publicKey)).toBe(true);
  });

  it('calls /auth/me with the new token; never sends it to the auth routes', async () => {
    await runStartup();
    expect(calls[0].auth).toBeUndefined(); // /health
    expect(loginCalls()[0].auth).toBeUndefined();
    expect(loginCalls()[1].auth).toBeUndefined();
    expect(loginCalls()[2]).toMatchObject({ method: 'GET', auth: 'Bearer token-for-dev-1' });
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
    expect(paths()).toEqual(['/health', '/auth/challenge']);
  });

  it('deletes the device_id, both names and the private key, and keeps the Cloudflare values', async () => {
    await runStartup();
    await expect(getDevice()).resolves.toBeNull();
    await expect(getPrivateKey()).resolves.toBeNull();
    for (const key of DEVICE_KEYS) expect(store.has(key)).toBe(false);
    expect(store.get(STORAGE_KEYS.cloudflareClientId)).toBe(ACCESS.clientId);
  });

  it('clears the identity it had put in the session', async () => {
    await runStartup();
    expect(getSession()).toMatchObject({ deviceId: null, userName: null, deviceName: null, token: null });
  });

  it('a later launch goes to the server config first, calling nothing', async () => {
    await runStartup();
    calls = [];
    expect(await runStartup()).toBe('serverConfig');
    expect(calls).toEqual([]);
  });
});

describe('verify-challenge 404: handled like a challenge 404 (decided 2026-11-19)', () => {
  beforeEach(async () => {
    await storeDevice();
    reply('/auth/challenge', ok({ challenge: CHALLENGE }));
    reply('/auth/verify-challenge', fail(404));
  });

  it('→ notRegistered, without calling /auth/me', async () => {
    expect(await runStartup()).toBe('notRegistered');
    expect(paths()).toEqual(['/health', '/auth/challenge', '/auth/verify-challenge']);
  });

  it('deletes the device_id, both names and the private key', async () => {
    await runStartup();
    await expect(getDevice()).resolves.toBeNull();
    await expect(getPrivateKey()).resolves.toBeNull();
    for (const key of DEVICE_KEYS) expect(store.has(key)).toBe(false);
  });

  it('clears the identity it had put in the session', async () => {
    await runStartup();
    expect(getSession()).toMatchObject({ deviceId: null, userName: null, deviceName: null, token: null });
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
