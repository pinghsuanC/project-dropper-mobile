// Pairing step 2 (context/details/1080): claim the code read on step 1, then Home (Connected)
// or the Error Dialog with Back to step 1. The claim call itself is in api/pairing.test.ts.
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { BackHandler, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ApiError, UnreachableError } from '@/api/client';
import { claimPairing } from '@/api/pairing';
import { strings } from '@/constants/strings';
import { getSession } from '@/state/session';
import { colors } from '@/theme';

jest.mock('@/api/pairing', () => ({ claimPairing: jest.fn() }));
// Home's check last said "not paired": Home must still show Connected after pairing.
jest.mock('@/lib/homeCheck', () => ({ checkConnection: jest.fn(async () => 'unpaired') }));
// Testing-menu states need SHOW_TESTING_MENU (fixed at import; Jest has no APP_ENV).
// The step 2 hold is 0 here, except in its own tests.
let mockMinPairingWait = 0;
jest.mock('@/constants/config', () =>
  Object.defineProperties(
    { ...jest.requireActual('@/constants/config') },
    {
      SHOW_TESTING_MENU: { get: () => true },
      MIN_CHECKING_MS: { value: 0 },
      MIN_PAIRING_WAIT_MS: { get: () => mockMinPairingWait },
    },
  ),
);

const p = strings.pairing;
const TOKEN = 'tok-AbC_123';
const PC = { device_id: 'pc-1', name: 'Desk PC', platform: 'desktop' };
const claim = jest.mocked(claimPairing);

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const errorDialog = () => screen.queryByTestId('pairing-wait-error');

/** Never answers, so the waiting look stays. */
const hold = () => claim.mockImplementation(() => new Promise(() => {}));

async function openWait(query = '') {
  await renderRouter('./src/app', { initialUrl: `/pairing/wait${query}` });
}

/** Home → step 1 → step 2, as the app gets there. */
async function openFromHome() {
  await renderRouter('./src/app', { initialUrl: '/home' });
  await act(() => router.push('/pairing/scan'));
  getSession().setPairingToken(TOKEN);
  await act(() => router.push('/pairing/wait'));
}

type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
const BACK_EVENT = {} as Parameters<BackListener>[0];
let backHandlers: BackListener[] = [];
const pressBack = () => act(async () => void backHandlers.at(-1)?.(BACK_EVENT));

beforeEach(() => {
  mockMinPairingWait = 0;
  getSession().reset();
  claim.mockReset().mockResolvedValue(PC);
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

/** The first background colour found walking up from a view: what the screen sits on. */
function backgroundBehind(testID: string) {
  type Node = { props: { style?: StyleProp<ViewStyle> }; parent: Node | null };
  let node: Node | null = screen.getByTestId(testID, { includeHiddenElements: true }) as unknown as Node;
  let background: ViewStyle['backgroundColor'];
  while (node && background === undefined) {
    background = StyleSheet.flatten(node.props.style)?.backgroundColor;
    node = node.parent;
  }
  return background;
}

describe('waiting', () => {
  test('shows the balloon, the step 2 window, the waiting line and a progress bar', async () => {
    hold();
    getSession().setPairingToken(TOKEN);
    await openWait();
    for (const text of [p.stepTwoBalloonTitle, p.stepTwoBalloonText, p.stepTwoTitle, p.waiting]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(errorDialog()).toBeNull();
  });

  test('sits on the teal desktop, not the platform grey', async () => {
    hold();
    getSession().setPairingToken(TOKEN);
    await openWait();
    expect(backgroundBehind('pairing-wait-content')).toBe(colors.desktop);
  });

  test('claims the code once, and takes it out of the session', async () => {
    hold();
    getSession().setPairingToken(TOKEN);
    await openWait();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(claim).toHaveBeenCalledWith(TOKEN);
    expect(getSession().pairingToken).toBeNull();
  });
});

describe('paired', () => {
  test('keeps the PC in the session and goes back to Home, which shows Connected', async () => {
    await openFromHome();
    expect(getSession().pairedWith).toEqual({ pcName: 'Desk PC', deviceId: 'pc-1' });
    expect(screen).toHavePathname('/home');
    expect(screen.getByText(strings.home.titlePaired)).toBeTruthy();
    expect(router.canGoBack()).toBe(false);
  });

  test('opened without Home behind it: goes to Home', async () => {
    getSession().setPairingToken(TOKEN);
    await openWait();
    expect(screen).toHavePathname('/home');
    expect(screen.getByText(strings.home.titlePaired)).toBeTruthy();
  });
});

describe('failed', () => {
  test.each([
    ['404 (invalid or expired)', new ApiError(404, 'Pairing code is invalid or expired.')],
    ['409 (this phone is paired)', new ApiError(409, 'Already paired with other device. Unpair first.')],
    ['409 (the PC is paired)', new ApiError(409, 'That device is already paired. Unpair it first.')],
    ['401', new ApiError(401, 'x')],
    ['403', new ApiError(403, 'x')],
    ['500', new ApiError(500, 'x')],
    ['no answer', new UnreachableError()],
  ])('%s: the Error Dialog with the one message, and no pairing', async (_label, failure) => {
    claim.mockRejectedValue(failure);
    getSession().setPairingToken(TOKEN);
    await openWait();
    expect(errorDialog()).toBeTruthy();
    expect(screen.getByText(p.claimError)).toBeTruthy();
    // Still step 2 behind it, hidden from screen readers while the dialog is open.
    expect(screen.getByText(p.stepTwoTitle, { includeHiddenElements: true })).toBeTruthy();
    expect(getSession().pairedWith).toBeNull();
    expect(screen).toHavePathname('/pairing/wait');
  });

  test.each([
    ['Back', () => press(p.back)],
    ['✕', () => fireEvent.press(screen.getAllByRole('button', { name: strings.ui.titleBar.close }).at(-1)!)],
    ['Android Back', pressBack],
  ])('%s returns to step 1', async (_label, leave) => {
    claim.mockRejectedValue(new ApiError(404, 'x'));
    await openFromHome();
    await leave();
    expect(screen).toHavePathname('/pairing/scan');
    expect(screen.getByText(p.scanPrompt)).toBeTruthy();
  });

  test('Back with nothing behind it: step 1', async () => {
    claim.mockRejectedValue(new ApiError(404, 'x'));
    getSession().setPairingToken(TOKEN);
    await openWait();
    await press(p.back);
    expect(screen).toHavePathname('/pairing/scan');
  });

  test('no code in the session (opened directly): the error at once, nothing claimed', async () => {
    await openWait();
    expect(errorDialog()).toBeTruthy();
    expect(claim).not.toHaveBeenCalled();
  });
});

describe('the waiting look stays for MIN_PAIRING_WAIT_MS, so a fast answer does not flash by', () => {
  const HOLD = 2000;
  const advance = (ms: number) => act(async () => void (await jest.advanceTimersByTimeAsync(ms)));

  beforeEach(() => {
    jest.useFakeTimers();
    mockMinPairingWait = HOLD;
  });
  afterEach(() => jest.useRealTimers());

  test('the real hold is 2 seconds', () => {
    expect(jest.requireActual('@/constants/config').MIN_PAIRING_WAIT_MS).toBe(2000);
  });

  test('paired at once: still waiting just before 2 s, then Home', async () => {
    getSession().setPairingToken(TOKEN);
    await openWait();
    await advance(HOLD - 1);
    expect(screen).toHavePathname('/pairing/wait');
    expect(screen.getByText(p.waiting)).toBeTruthy();
    expect(getSession().pairedWith).toBeNull();
    await advance(1);
    expect(screen).toHavePathname('/home');
    expect(getSession().pairedWith).toEqual({ pcName: 'Desk PC', deviceId: 'pc-1' });
  });

  test('failed at once: no error before 2 s, then the Error Dialog', async () => {
    claim.mockRejectedValue(new ApiError(404, 'x'));
    getSession().setPairingToken(TOKEN);
    await openWait();
    await advance(HOLD - 1);
    expect(errorDialog()).toBeNull();
    await advance(1);
    expect(errorDialog()).toBeTruthy();
  });

  test('no code: the error at once, nothing to wait for', async () => {
    await openWait();
    expect(errorDialog()).toBeTruthy();
  });
});

describe('testing-menu states', () => {
  test('?state=waiting: the waiting look, nothing claimed', async () => {
    getSession().setPairingToken(TOKEN);
    await openWait('?state=waiting');
    expect(screen.getByText(p.waiting)).toBeTruthy();
    expect(errorDialog()).toBeNull();
    expect(claim).not.toHaveBeenCalled();
  });

  test('?state=error: the Error Dialog, nothing claimed; Back goes to step 1', async () => {
    getSession().setPairingToken(TOKEN);
    await openWait('?state=error');
    expect(errorDialog()).toBeTruthy();
    expect(claim).not.toHaveBeenCalled();
    await press(p.back);
    expect(screen).toHavePathname('/pairing/scan');
  });
});
