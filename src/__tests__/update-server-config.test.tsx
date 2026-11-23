// The server config (context/details/1100): scan the PC's server-config QR code, check it with
// GET /health (lib/serverConfig's applyServerConfig, mocked here), then Landing. The camera
// looks themselves are shared with Pairing step 1 and tested in pairing-scan.test.tsx.
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as expoCamera from 'expo-camera';
import { BackHandler } from 'react-native';

import { strings } from '@/constants/strings';
import { applyServerConfig, type ServerConfigResult } from '@/lib/serverConfig';
import { runStartup } from '@/lib/startup';

const { cameraMock } = expoCamera as unknown as typeof import('../../__mocks__/expo-camera');

jest.mock('@/lib/serverConfig', () => ({ applyServerConfig: jest.fn() }));
// Landing (where a working config goes) runs start-up on mount; keep it pending.
jest.mock('@/lib/startup', () => ({ runStartup: jest.fn(() => new Promise(() => {})) }));
// SHOW_TESTING_MENU and CLOUDFLARE_ACCESS_REQUIRED are fixed at import (Jest has no APP_ENV):
// getters let a test pick them. The checking look isn't held here (MIN_CHECKING_MS 0).
let mockTunnelRequired = true;
jest.mock('@/constants/config', () =>
  Object.defineProperties(
    { ...jest.requireActual('@/constants/config') },
    {
      SHOW_TESTING_MENU: { get: () => true },
      CLOUDFLARE_ACCESS_REQUIRED: { get: () => mockTunnelRequired },
      MIN_CHECKING_MS: { value: 0 },
    },
  ),
);

const c = strings.serverConfig;
const sc = strings.qrScan;
const SECRET = 'cf-secret-key';
const QR = JSON.stringify({ cloudflare_client_id: 'id.access', cloudflare_access_key: SECRET });
const NULL_QR = JSON.stringify({ cloudflare_client_id: null, cloudflare_access_key: null });
const HIDDEN = { includeHiddenElements: true };

const applyMock = jest.mocked(applyServerConfig);
const open = (query = '') => renderRouter('./src/app', { initialUrl: `/update-server-config${query}` });
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const error = () => screen.queryByTestId('server-config-error');
const camera = () => screen.queryByTestId('camera-view');
const start = () => screen.queryByText(c.scanPrompt);

type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
const BACK_EVENT = {} as Parameters<BackListener>[0];
let backHandlers: BackListener[] = [];
/** Android Back, as React Native runs it: newest listener first, until one takes it. */
const pressBack = async () => {
  let handled = false;
  await act(async () => {
    handled = [...backHandlers].reverse().some((handler) => handler(BACK_EVENT) === true);
  });
  return handled;
};

async function scan(data: string) {
  cameraMock.setPermission(cameraMock.GRANTED);
  await press(sc.openCamera);
  await act(async () => cameraMock.scan({ type: 'qr', data }));
}

/** A check that answers only when the test says so. */
function deferred() {
  let resolve!: (result: ServerConfigResult) => void;
  const promise = new Promise<ServerConfigResult>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  cameraMock.reset();
  mockTunnelRequired = true;
  applyMock.mockReset().mockResolvedValue('ok');
  jest.mocked(runStartup).mockClear();
  backHandlers = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.push(handler);
    return {
      remove: () => {
        backHandlers = backHandlers.filter((h) => h !== handler);
      },
    };
  });
});

afterEach(() => jest.restoreAllMocks());

describe('the start look', () => {
  test('shows its own text: balloon, title, warning, prompt and note', async () => {
    await open();
    for (const text of [c.balloonTitle, c.balloonText, c.windowTitle, c.noShare, c.scanPrompt, c.onceNote]) {
      expect(screen.getByText(text, { exact: false })).toBeTruthy();
    }
    expect(screen.getByText('Scan the code on the desktop if you want to join the server.')).toBeTruthy();
    expect(screen.getByRole('button', { name: sc.openCamera })).toBeTruthy();
    // Nothing of Pairing's.
    expect(screen.queryByText(strings.pairing.stepOneTitle)).toBeNull();
  });

  test('its ✕ is off (drawn, as every title bar has one): the app needs a working server to start', async () => {
    await open();
    const close = screen.getByRole('button', { name: strings.ui.titleBar.close });
    expect(close.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(close);
    expect(screen).toHavePathname('/update-server-config');
  });

  test('Android Back does not leave it', async () => {
    await open();
    expect(await pressBack()).toBe(true);
    expect(screen).toHavePathname('/update-server-config');
    expect(start()).toBeTruthy();
  });

  test('Android Back still closes the camera, back to the start look', async () => {
    await open();
    cameraMock.setPermission(cameraMock.GRANTED);
    await press(sc.openCamera);
    expect(camera()).toBeTruthy();
    expect(await pressBack()).toBe(true);
    expect(camera()).toBeNull();
    expect(start()).toBeTruthy();
  });
});

describe('scanning', () => {
  test('a server-config code: the checking look, the check, then Landing', async () => {
    const check = deferred();
    applyMock.mockReturnValueOnce(check.promise);
    await open();
    await scan(QR);
    expect(screen.getByTestId('server-config-checking')).toBeTruthy();
    expect(screen.getByText(c.checking)).toBeTruthy();
    expect(applyMock).toHaveBeenCalledWith({ kind: 'tunnel', access: { clientId: 'id.access', accessKey: SECRET } });
    await act(async () => check.resolve('ok'));
    expect(screen).toHavePathname('/');
    expect(runStartup).toHaveBeenCalledTimes(1);
  });

  test('never shows or logs the access key', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    applyMock.mockReturnValueOnce(new Promise(() => {}));
    await open();
    await scan(QR);
    expect(JSON.stringify(screen.toJSON())).not.toContain(SECRET);
    expect(JSON.stringify(log.mock.calls)).not.toContain(SECRET);
  });

  test.each([
    ['refused by Cloudflare', 'refused' as const, c.refused],
    ['no working server', 'unreachable' as const, c.unreachable],
    ['the phone could not save the values', 'saveFailed' as const, c.saveFailed],
  ])('%s: its error over the scan; OK goes back to the start look', async (_label, result, text) => {
    applyMock.mockResolvedValueOnce(result);
    await open();
    await scan(QR);
    expect(error()).toBeTruthy();
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen).toHavePathname('/update-server-config');
    await press(sc.ok);
    expect(error()).toBeNull();
    expect(start()).toBeTruthy();
  });

  test('after a failed check the camera reads again, and a working code goes on', async () => {
    applyMock.mockResolvedValueOnce('refused');
    await open();
    await scan(QR);
    await press(sc.ok);
    await scan(QR);
    expect(applyMock).toHaveBeenCalledTimes(2);
    expect(screen).toHavePathname('/');
  });

  test.each([
    ['a pairing code', JSON.stringify({ pairing_token: 'tok' })],
    ['not JSON', 'hello'],
  ])('%s: "isn\'t a server code", nothing checked', async (_label, data) => {
    await open();
    await scan(data);
    expect(error()).toBeTruthy();
    expect(screen.getByText(c.notServerConfigQr)).toBeTruthy();
    expect(applyMock).not.toHaveBeenCalled();
  });

  test('a code with null values is "not a server code" behind the tunnel (dev, prod)', async () => {
    await open();
    await scan(NULL_QR);
    expect(screen.getByText(c.notServerConfigQr)).toBeTruthy();
    expect(applyMock).not.toHaveBeenCalled();
  });

  test('on local, a code with null values is "no tunnel"', async () => {
    mockTunnelRequired = false;
    await open();
    await scan(NULL_QR);
    expect(applyMock).toHaveBeenCalledWith({ kind: 'noTunnel' });
    expect(screen).toHavePathname('/');
  });
});

describe('testing-menu states', () => {
  test.each([
    ['cameraNote', () => screen.queryByTestId('server-config-note')],
    ['camera', camera],
    ['checking', () => screen.queryByTestId('server-config-checking')],
    ['error', error],
  ])('?state=%s opens that look, calling nothing', async (state, find) => {
    await open(`?state=${state}`);
    expect(find()).toBeTruthy();
    expect(applyMock).not.toHaveBeenCalled();
  });

  test('the error state shows the refused error, with the start look hidden from TalkBack', async () => {
    await open('?state=error');
    expect(screen.getByText(c.refused)).toBeTruthy();
    expect(screen.getByTestId('server-config-start', HIDDEN).props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
