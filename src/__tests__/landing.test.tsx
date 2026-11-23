// Landing runs start-up (lib/startup, mocked here) and shows its outcome (1010).
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';

import { POPUP_REDIRECT_MS } from '@/constants/config';
import { strings } from '@/constants/strings';
import { runStartup, type StartupOutcome } from '@/lib/startup';
import { getSession } from '@/state/session';

jest.mock('@/lib/startup', () => ({ runStartup: jest.fn() }));
// A pass-through spy on router.replace: navigation still happens, and every copy of
// expo-router the app and the test router load shares it.
jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  const replace = jest.fn((...args: unknown[]) => actual.router.replace(...args));
  return { ...actual, router: { ...actual.router, replace } };
});

const runStartupMock = runStartup as jest.MockedFunction<typeof runStartup>;
const HIDDEN = { includeHiddenElements: true };

/** A start-up that finishes only when the test says so. */
function deferred() {
  let resolve!: (outcome: StartupOutcome) => void;
  const promise = new Promise<StartupOutcome>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function openLanding() {
  await renderRouter('./src/app', { initialUrl: '/' });
}

/** Let the resolved start-up promise reach the screen. */
async function settle() {
  await act(async () => {});
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

const gifSource = () => JSON.stringify(screen.getByTestId('landing-popup-gif-image', HIDDEN).props.source);

beforeEach(() => {
  jest.useFakeTimers();
  runStartupMock.mockReset();
  (router.replace as jest.Mock).mockClear();
  getSession().reset();
});

afterEach(() => {
  jest.useRealTimers();
});

test('shows the terminal and no popup while start-up runs', async () => {
  runStartupMock.mockReturnValue(deferred().promise);
  await openLanding();
  expect(screen.getByText(strings.ui.terminalTitle)).toBeTruthy();
  expect(screen.getByText(strings.landing.connecting)).toBeTruthy();
  expect(screen.queryByTestId('landing-popup')).toBeNull();
  expect(runStartupMock).toHaveBeenCalledTimes(1);
});

describe('welcome', () => {
  test('greets the stored user name, with the welcome GIF', async () => {
    runStartupMock.mockImplementation(async () => {
      getSession().setIdentity({ deviceId: 'dev-1', userName: 'Ping', deviceName: 'Pixel' });
      return 'welcome';
    });
    await openLanding();
    await settle();
    expect(screen.getByText(strings.landing.welcomeTitle)).toBeTruthy();
    expect(screen.getByText(strings.landing.welcome('Ping'))).toBeTruthy();
    expect(gifSource()).toContain('welcome.gif');
  });

  test('without a user name uses the no-name message', async () => {
    runStartupMock.mockResolvedValue('welcome');
    await openLanding();
    await settle();
    expect(screen.getByText(strings.landing.welcomeNoName)).toBeTruthy();
  });

  test('goes to Home after the popup delay, replacing Landing', async () => {
    runStartupMock.mockResolvedValue('welcome');
    await openLanding();
    await settle();
    await advance(POPUP_REDIRECT_MS - 1);
    expect(screen).toHavePathname('/');
    await advance(1);
    expect(screen).toHavePathname('/home');
    expect(router.replace).toHaveBeenCalledWith('/home');
  });
});

describe('not registered', () => {
  test('shows the popup with the notWelcome GIF', async () => {
    runStartupMock.mockResolvedValue('notRegistered');
    await openLanding();
    await settle();
    expect(screen.getByText(strings.landing.notRegisteredTitle)).toBeTruthy();
    expect(screen.getByText(strings.landing.notRegistered)).toBeTruthy();
    expect(gifSource()).toContain('notWelcome.gif');
  });

  test('goes to Register after the popup delay, replacing Landing', async () => {
    runStartupMock.mockResolvedValue('notRegistered');
    await openLanding();
    await settle();
    await advance(POPUP_REDIRECT_MS - 1);
    expect(screen).toHavePathname('/');
    await advance(1);
    expect(screen).toHavePathname('/register');
    expect(router.replace).toHaveBeenCalledWith('/register');
  });
});

describe('server unreachable', () => {
  test('shows the popup with the offline GIF and a Retry button', async () => {
    runStartupMock.mockResolvedValue('unreachable');
    await openLanding();
    await settle();
    expect(screen.getByText(strings.landing.unreachableTitle)).toBeTruthy();
    expect(screen.getByText(strings.landing.unreachable)).toBeTruthy();
    expect(screen.getByRole('button', { name: strings.landing.retry })).toBeTruthy();
    expect(gifSource()).toContain('offline.gif');
  });

  test('stays until Retry: no redirect', async () => {
    runStartupMock.mockResolvedValue('unreachable');
    await openLanding();
    await settle();
    await advance(POPUP_REDIRECT_MS * 5);
    expect(screen).toHavePathname('/');
    expect(screen.getByText(strings.landing.unreachableTitle)).toBeTruthy();
  });

  test('Retry hides the popup, runs start-up again and shows the new outcome', async () => {
    const second = deferred();
    runStartupMock.mockResolvedValueOnce('unreachable').mockReturnValueOnce(second.promise);
    await openLanding();
    await settle();

    await fireEvent.press(screen.getByRole('button', { name: strings.landing.retry }));
    expect(runStartupMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('landing-popup')).toBeNull();
    expect(screen.getByText(strings.landing.connecting)).toBeTruthy();

    await act(async () => second.resolve('welcome'));
    expect(screen.getByText(strings.landing.welcomeTitle)).toBeTruthy();
  });
});

describe('server config (1100)', () => {
  test('goes straight to /update-server-config, with no popup and no wait', async () => {
    runStartupMock.mockResolvedValue('serverConfig');
    await openLanding();
    await settle();
    expect(router.replace).toHaveBeenCalledWith('/update-server-config');
    expect(screen).toHavePathname('/update-server-config');
    expect(screen.queryByTestId('landing-popup')).toBeNull();
  });
});

test('leaving Landing before the delay cancels the redirect', async () => {
  runStartupMock.mockResolvedValue('welcome');
  await openLanding();
  await settle();
  await act(async () => {
    screen.unmount();
  });
  jest.advanceTimersByTime(POPUP_REDIRECT_MS * 2);
  expect(router.replace).not.toHaveBeenCalled();
});

test('a start-up that finishes after Landing is gone shows nothing and goes nowhere', async () => {
  const late = deferred();
  runStartupMock.mockReturnValue(late.promise);
  await openLanding();
  await act(async () => {
    screen.unmount();
  });
  await act(async () => late.resolve('welcome'));
  jest.advanceTimersByTime(POPUP_REDIRECT_MS * 2);
  expect(router.replace).not.toHaveBeenCalled();
});
