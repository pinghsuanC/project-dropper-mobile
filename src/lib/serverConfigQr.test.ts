// Reading the PC's server-config QR code (context/details/1100): only the Cloudflare Access
// service token, `{ cloudflare_client_id, cloudflare_access_key }`.
import { serverConfigFrom } from '@/lib/serverConfigQr';

const qr = (body: unknown) => JSON.stringify(body);

describe('a server-config code', () => {
  it('gives both values', () => {
    expect(serverConfigFrom(qr({ cloudflare_client_id: 'id.access', cloudflare_access_key: 'secret' }), { allowNoTunnel: false })).toEqual({
      kind: 'tunnel',
      access: { clientId: 'id.access', accessKey: 'secret' },
    });
  });

  it('keeps the values exactly as read (no trimming inside)', () => {
    const result = serverConfigFrom(qr({ cloudflare_client_id: 'a b', cloudflare_access_key: 'c+d/e=' }), { allowNoTunnel: false });
    expect(result).toEqual({ kind: 'tunnel', access: { clientId: 'a b', accessKey: 'c+d/e=' } });
  });
});

describe('both values null (a PC without the env set)', () => {
  const nulls = qr({ cloudflare_client_id: null, cloudflare_access_key: null });

  it('is "no tunnel" when that is allowed (local)', () => {
    expect(serverConfigFrom(nulls, { allowNoTunnel: true })).toEqual({ kind: 'noTunnel' });
  });

  it('is not a server-config code otherwise (dev, prod)', () => {
    expect(serverConfigFrom(nulls, { allowNoTunnel: false })).toBeNull();
  });
});

describe('not a server-config code', () => {
  it.each([
    ['a pairing code', qr({ pairing_token: 'tok' })],
    ['not JSON', 'https://example.com'],
    ['an array', qr(['id', 'secret'])],
    ['JSON null', 'null'],
    ['a missing access key', qr({ cloudflare_client_id: 'id' })],
    ['a missing client id', qr({ cloudflare_access_key: 'secret' })],
    ['a number', qr({ cloudflare_client_id: 1, cloudflare_access_key: 'secret' })],
    ['a blank value', qr({ cloudflare_client_id: '  ', cloudflare_access_key: 'secret' })],
    ['one null, one value', qr({ cloudflare_client_id: null, cloudflare_access_key: 'secret' })],
  ])('%s → null', (_label, text) => {
    expect(serverConfigFrom(text, { allowNoTunnel: true })).toBeNull();
  });
});
