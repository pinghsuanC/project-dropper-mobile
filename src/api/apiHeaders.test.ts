import { isApiUrl, setCloudflareAccess, withApiHeaders } from '@/api/apiHeaders';
import { apiBaseUrl } from '@/constants/config';

jest.mock('@/constants/config', () => ({
  ...jest.requireActual('@/constants/config'),
  apiBaseUrl: jest.fn(),
}));

const baseUrlMock = jest.mocked(apiBaseUrl);
const BASE = 'https://postie98.pinghsuan.dev';
const ACCESS = { clientId: 'id.access', accessKey: 'cf-secret-key' };
const R2_URL = 'https://abc123.r2.cloudflarestorage.com/bucket/file?X-Amz-Signature=deadbeef';

beforeEach(() => {
  baseUrlMock.mockReset();
  baseUrlMock.mockReturnValue(BASE);
  setCloudflareAccess(null);
});

function cloudflareHeaders(headers: Record<string, string>): string[] {
  return Object.keys(headers).filter((name) => name.toLowerCase().startsWith('cf-access-'));
}

describe('isApiUrl', () => {
  it.each([
    BASE,
    `${BASE}/`,
    `${BASE}/health`,
    `${BASE}/files/sent?page=2`,
    'HTTPS://POSTIE98.PINGHSUAN.DEV/auth/me',
    'https://postie98.pinghsuan.dev:443/health',
  ])('true for %s', (url) => {
    expect(isApiUrl(url)).toBe(true);
  });

  it.each([
    'https://postie98.pinghsuan.dev.attacker.com/health',
    'https://attacker.com/?u=https://postie98.pinghsuan.dev',
    'https://evil.com/https://postie98.pinghsuan.dev/x',
    'https://postie98.pinghsuan.dev@attacker.com/health',
    'https://user:pass@postie98.pinghsuan.dev/health',
    'http://postie98.pinghsuan.dev/health',
    'https://postie98.pinghsuan.dev:8443/health',
    'https://api.postie98.pinghsuan.dev/health',
    'https://pinghsuan.dev/health',
    R2_URL,
    '',
    'not a url',
    '//postie98.pinghsuan.dev/health',
    'ftp://postie98.pinghsuan.dev/health',
    'https:///health',
    'https://:443/health',
  ])('false for %s', (url) => {
    expect(isApiUrl(url)).toBe(false);
  });

  it('compares the port too, with a local http base', () => {
    baseUrlMock.mockReturnValue('http://192.168.1.20:8000');
    expect(isApiUrl('http://192.168.1.20:8000/health')).toBe(true);
    expect(isApiUrl('http://192.168.1.20/health')).toBe(false);
    expect(isApiUrl('http://192.168.1.20:8001/health')).toBe(false);
  });

  it('treats an http :80 written out as the same origin', () => {
    baseUrlMock.mockReturnValue('http://server.test');
    expect(isApiUrl('http://server.test:80/x')).toBe(true);
  });

  it('is false (does not throw) when no server address is configured', () => {
    baseUrlMock.mockImplementation(() => {
      throw new Error('EXPO_PUBLIC_API_BASE_URL is not set.');
    });
    expect(isApiUrl(`${BASE}/health`)).toBe(false);
  });
});

describe('withApiHeaders', () => {
  it('adds both Cloudflare headers to an API URL when values are stored', () => {
    setCloudflareAccess(ACCESS);
    expect(withApiHeaders(`${BASE}/health`, { Accept: 'application/json' })).toEqual({
      Accept: 'application/json',
      'CF-Access-Client-Id': 'id.access',
      'CF-Access-Client-Secret': 'cf-secret-key',
    });
  });

  it.each([R2_URL, 'https://postie98.pinghsuan.dev.attacker.com/x', 'https://api.example.com/quotes'])(
    'adds nothing to another URL (%s)',
    (url) => {
      setCloudflareAccess(ACCESS);
      expect(withApiHeaders(url, { Accept: 'application/json' })).toEqual({ Accept: 'application/json' });
    },
  );

  it('adds neither header when no values are stored', () => {
    expect(cloudflareHeaders(withApiHeaders(`${BASE}/x`, {}))).toEqual([]);
  });

  it('stops adding them once cleared', () => {
    setCloudflareAccess(ACCESS);
    setCloudflareAccess(null);
    expect(cloudflareHeaders(withApiHeaders(`${BASE}/x`, {}))).toEqual([]);
  });

  it('uses the values it is given instead of the stored ones', () => {
    setCloudflareAccess(ACCESS);
    const headers = withApiHeaders(`${BASE}/health`, {}, { clientId: 'new-id', accessKey: 'new-key' });
    expect(headers['CF-Access-Client-Id']).toBe('new-id');
    expect(headers['CF-Access-Client-Secret']).toBe('new-key');
  });

  it('given null, adds none even when values are stored', () => {
    setCloudflareAccess(ACCESS);
    expect(cloudflareHeaders(withApiHeaders(`${BASE}/health`, {}, null))).toEqual([]);
  });

  it('given values, still adds nothing to another URL', () => {
    expect(withApiHeaders(R2_URL, {}, ACCESS)).toEqual({});
  });

  it('does not change the object it was given', () => {
    setCloudflareAccess(ACCESS);
    const input = { Accept: 'application/json' };
    const output = withApiHeaders(`${BASE}/x`, input);
    expect(input).toEqual({ Accept: 'application/json' });
    expect(output).not.toBe(input);
  });

  it("keeps a header the caller already set, in any letter case", () => {
    setCloudflareAccess(ACCESS);
    const headers = withApiHeaders(`${BASE}/x`, { 'cf-access-client-id': 'caller-id' });
    expect(headers['cf-access-client-id']).toBe('caller-id');
    expect(headers['CF-Access-Client-Id']).toBeUndefined();
    expect(headers['CF-Access-Client-Secret']).toBe('cf-secret-key');
  });
});
