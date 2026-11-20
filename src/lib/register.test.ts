// The Register flow (context/details/1050), end to end through the real storage, crypto and
// API client. Only the edges are mocked: expo-secure-store, fetch, the Android ID and random
// bytes (same fakes as startup.test.ts).
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import * as SecureStore from 'expo-secure-store';

import { apiBaseUrl, STORAGE_KEYS } from '@/constants/config';
import { publicKeyToPem } from '@/lib/crypto';
import { registerPhone, validateNames, type RegisterStep } from '@/lib/register';
import { getDevice, getPrivateKey, savePrivateKey } from '@/lib/storage';
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
const FINGERPRINT = '9d2e6e6891dd1bbe2119e1f12c1d81e220b8da14a64f68f83dddd8e6fc6769a0';
const CHALLENGE = 'Y2hhbGxlbmdlLWJ5dGVz';
const NAMES = { userName: 'Alex', deviceName: 'Pixel 8' };

// --- fake server -------------------------------------------------------------------------

type Reply = { status: number; body?: unknown } | 'network';
type Call = { path: string; method: string; body: unknown; auth: string | undefined };

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;
let replies: Record<string, Reply[]> = {};
let calls: Call[] = [];

const ok = (data: unknown, status = 200): Reply => ({ status, body: { message: 'ok', data } });
const fail = (status: number, detail: unknown = `failed ${status}`): Reply => ({ status, body: { detail } });

function reply(path: string, ...answers: Reply[]) {
  (replies[path] ??= []).push(...answers);
}

const paths = () => calls.map((c) => c.path);
const registerBody = () => calls.find((c) => c.path === '/auth/register')?.body as Record<string, unknown>;

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

function replyRegister(deviceId = 'dev-9') {
  reply('/auth/register', ok({ device_id: deviceId }, 201));
}

function replyLogin(deviceId = 'dev-9', name = 'Pixel 8 (server)') {
  reply('/auth/challenge', ok({ challenge: CHALLENGE }));
  reply('/auth/verify-challenge', ok({ token: `token-for-${deviceId}` }));
  reply('/auth/me', ok({ device_id: deviceId, name, platform: 'android' }));
}

const writtenValues = () => (SecureStore.setItemAsync as jest.Mock).mock.calls.map(([, value]) => value);

// --- validation --------------------------------------------------------------------------

describe('validateNames', () => {
  it('both names given → no problem', () => {
    expect(validateNames(NAMES)).toBeNull();
  });

  it.each(['', '   '])('empty user name (%j) → userNameRequired, checked first', (userName) => {
    expect(validateNames({ userName, deviceName: '' })).toBe('userNameRequired');
  });

  it.each(['', '   '])('empty device name (%j) → deviceNameRequired', (deviceName) => {
    expect(validateNames({ userName: 'Alex', deviceName })).toBe('deviceNameRequired');
  });
});

// --- the key -----------------------------------------------------------------------------

describe('the key', () => {
  it('no stored key: makes a new one, saves it, and registers its public key', async () => {
    replyRegister();
    replyLogin();
    await registerPhone(NAMES);
    const saved = await getPrivateKey();
    expect(saved).not.toBeNull();
    expect(registerBody().public_key).toBe(publicKeyToPem(ed.getPublicKey(saved!)));
  });

  it('a stored key is reused, not replaced', async () => {
    const privateKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
    await savePrivateKey(privateKey);
    jest.clearAllMocks();
    replyRegister();
    replyLogin();
    await registerPhone(NAMES);
    expect(registerBody().public_key).toBe(publicKeyToPem(ed.getPublicKey(privateKey)));
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(STORAGE_KEYS.privateKey, expect.anything());
  });
});

// --- success -----------------------------------------------------------------------------

describe('registered', () => {
  beforeEach(() => {
    replyRegister();
    replyLogin();
  });

  it('→ registered, after register → challenge → verify → /auth/me', async () => {
    await expect(registerPhone(NAMES)).resolves.toEqual({ kind: 'registered' });
    expect(paths()).toEqual(['/auth/register', '/auth/challenge', '/auth/verify-challenge', '/auth/me']);
  });

  it('sends exactly name, platform, public_key and fingerprint; never the user name', async () => {
    await registerPhone(NAMES);
    const body = registerBody();
    expect(Object.keys(body).sort()).toEqual(['fingerprint', 'name', 'platform', 'public_key']);
    expect(body).toMatchObject({ name: 'Pixel 8', platform: 'android', fingerprint: FINGERPRINT });
    expect(body.public_key).toMatch(/^-----BEGIN PUBLIC KEY-----\n/);
    expect(JSON.stringify(calls.map((c) => c.body))).not.toContain('Alex');
  });

  it('logs in with the same fingerprint it registered with', async () => {
    await registerPhone(NAMES);
    const verify = calls.find((c) => c.path === '/auth/verify-challenge')?.body as Record<string, unknown>;
    expect(Object.keys(verify).sort()).toEqual(['challenge', 'device_id', 'fingerprint', 'signature']);
    expect(verify.fingerprint).toBe(FINGERPRINT);
    expect(verify.fingerprint).toBe(registerBody().fingerprint);
  });

  it('reports its steps in order', async () => {
    const steps: RegisterStep[] = [];
    await registerPhone(NAMES, (step) => steps.push(step));
    expect(steps).toEqual(['keys', 'registering']);
  });

  it('saves the device_id and both names', async () => {
    await registerPhone(NAMES);
    await expect(getDevice()).resolves.toEqual({ deviceId: 'dev-9', userName: 'Alex', deviceName: 'Pixel 8' });
  });

  it('logs in with the new device_id and fills the session', async () => {
    await registerPhone(NAMES);
    expect(calls.find((c) => c.path === '/auth/challenge')?.body).toEqual({ device_id: 'dev-9' });
    expect(calls.find((c) => c.path === '/auth/me')?.auth).toBe('Bearer token-for-dev-9');
    expect(getSession()).toMatchObject({
      deviceId: 'dev-9',
      userName: 'Alex',
      deviceName: 'Pixel 8 (server)',
      token: 'token-for-dev-9',
    });
  });

  it('sends no auth header to the register and log-in routes', async () => {
    await registerPhone(NAMES);
    expect(calls.filter((c) => c.path !== '/auth/me').every((c) => c.auth === undefined)).toBe(true);
  });

  it('never writes the token to storage', async () => {
    await registerPhone(NAMES);
    expect(writtenValues()).not.toContain('token-for-dev-9');
  });
});

// --- log-in fails after registering --------------------------------------------------------

describe('loginFailed: registered and saved, but the log-in after it failed', () => {
  it.each<[string, () => void]>([
    ['challenge network error', () => reply('/auth/challenge', 'network')],
    ['challenge 500', () => reply('/auth/challenge', fail(500))],
    [
      'verify 401',
      () => {
        reply('/auth/challenge', ok({ challenge: CHALLENGE }));
        reply('/auth/verify-challenge', fail(401));
      },
    ],
    [
      '/auth/me 401',
      () => {
        reply('/auth/challenge', ok({ challenge: CHALLENGE }));
        reply('/auth/verify-challenge', ok({ token: 'token-x' }));
        reply('/auth/me', fail(401));
      },
    ],
  ])('%s → loginFailed, device kept, no token', async (_label, failLogin) => {
    replyRegister();
    failLogin();
    await expect(registerPhone(NAMES)).resolves.toEqual({ kind: 'loginFailed' });
    await expect(getDevice()).resolves.toMatchObject({ deviceId: 'dev-9' });
    expect(getSession().token).toBeNull();
  });
});

// --- errors before anything is saved ----------------------------------------------------

describe('unreachable', () => {
  it.each<[string, Reply]>([
    ['network error', 'network'],
    ['500', fail(500)],
    ['503 with no JSON body', { status: 503 }],
  ])('%s on register → unreachable', async (_label, answer) => {
    reply('/auth/register', answer);
    await expect(registerPhone(NAMES)).resolves.toEqual({ kind: 'unreachable' });
  });

  it('no server URL → unreachable, no call', async () => {
    jest.mocked(apiBaseUrl).mockImplementationOnce(() => {
      throw new Error('EXPO_PUBLIC_API_BASE_URL is not set');
    });
    await expect(registerPhone(NAMES)).resolves.toEqual({ kind: 'unreachable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('secure storage failing → unreachable, never throws', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keystore locked'));
    await expect(registerPhone(NAMES)).resolves.toEqual({ kind: 'unreachable' });
  });
});

describe('rejected', () => {
  it.each([400, 409])('%i → rejected with the status and detail text', async (status) => {
    reply('/auth/register', fail(status, `failed ${status}`));
    await expect(registerPhone(NAMES)).resolves.toEqual({ kind: 'rejected', status, detail: `failed ${status}` });
  });

  it('422 → its list as text', async () => {
    reply('/auth/register', fail(422, [{ loc: ['body', 'fingerprint'], msg: 'Field required', type: 'missing' }]));
    await expect(registerPhone(NAMES)).resolves.toEqual({
      kind: 'rejected',
      status: 422,
      detail: 'fingerprint: Field required',
    });
  });

  it('a 4xx with no JSON body → rejected with no detail', async () => {
    reply('/auth/register', { status: 400 });
    await expect(registerPhone(NAMES)).resolves.toEqual({ kind: 'rejected', status: 400, detail: undefined });
  });
});

describe('after an error', () => {
  it.each<[string, Reply]>([
    ['unreachable', 'network'],
    ['rejected', fail(409)],
  ])('%s: nothing is saved but the key, and no log-in is tried', async (_label, answer) => {
    reply('/auth/register', answer);
    await registerPhone(NAMES);
    await expect(getDevice()).resolves.toBeNull();
    expect(store.has(STORAGE_KEYS.userName)).toBe(false);
    expect(store.has(STORAGE_KEYS.deviceName)).toBe(false);
    await expect(getPrivateKey()).resolves.not.toBeNull();
    expect(paths()).toEqual(['/auth/register']);
    expect(getSession().deviceId).toBeNull();
  });
});
