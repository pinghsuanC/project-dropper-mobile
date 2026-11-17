// config.ts reads process.env once at import, so each case loads a fresh copy.
type Config = typeof import('./config');

function loadConfig(env: Record<string, string | undefined>): Config {
  const saved = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    let config!: Config;
    jest.isolateModules(() => {
      config = jest.requireActual('./config');
    });
    return config;
  } finally {
    process.env = saved;
  }
}

describe('APP_ENV and the testing menu', () => {
  it.each([
    ['missing', undefined],
    ['unknown', 'staging'],
    ['prod', 'prod'],
  ])('%s APP_ENV → prod, menu hidden', (_label, value) => {
    const config = loadConfig({ EXPO_PUBLIC_APP_ENV: value });
    expect(config.APP_ENV).toBe('prod');
    expect(config.SHOW_TESTING_MENU).toBe(false);
  });

  it.each(['local', 'dev'])('%s → menu shown', (value) => {
    const config = loadConfig({ EXPO_PUBLIC_APP_ENV: value });
    expect(config.APP_ENV).toBe(value);
    expect(config.SHOW_TESTING_MENU).toBe(true);
  });
});

describe('apiBaseUrl', () => {
  it('returns the server URL without a trailing slash', () => {
    const config = loadConfig({ EXPO_PUBLIC_API_BASE_URL: 'http://192.168.1.20:8000/' });
    expect(config.apiBaseUrl()).toBe('http://192.168.1.20:8000');
  });

  it('throws when the variable is missing', () => {
    const config = loadConfig({ EXPO_PUBLIC_API_BASE_URL: undefined });
    expect(() => config.apiBaseUrl()).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });

  it('throws when the variable is blank', () => {
    const config = loadConfig({ EXPO_PUBLIC_API_BASE_URL: '  ' });
    expect(() => config.apiBaseUrl()).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });
});

describe('fixed values', () => {
  it('waits 2 seconds before a Landing redirect', () => {
    expect(loadConfig({}).POPUP_REDIRECT_MS).toBe(2000);
  });

  it('accepts uploads up to 100 MB, counted in 1024s', () => {
    expect(loadConfig({}).MAX_UPLOAD_BYTES).toBe(104_857_600);
  });

  it('cancels an upload after 30 seconds without progress', () => {
    expect(loadConfig({}).UPLOAD_STALL_TIMEOUT_MS).toBe(30_000);
  });

  it('keeps every storage key within secure-store rules', () => {
    const keys = Object.values(loadConfig({}).STORAGE_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[A-Za-z0-9._-]+$/);
  });
});
