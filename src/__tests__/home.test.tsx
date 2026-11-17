// The Home screen (context/details/1060): its looks, the balloon, and where each button goes.
// The look comes from the connection check (Part 2), or from a testing-menu state.
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { CLOCK_TICK_MS } from '@/constants/config';
import { strings } from '@/constants/strings';
import type { ConnectionResult } from '@/lib/homeCheck';
import { quoteForDate } from '@/lib/quotes';
import { getSession } from '@/state/session';
import { colors, sizes, tones } from '@/theme';

// Landing runs start-up on mount; keep it pending so nothing calls the server.
jest.mock('@/lib/startup', () => ({ runStartup: jest.fn(() => new Promise(() => {})) }));
// Testing-menu states need SHOW_TESTING_MENU (fixed at import; Jest has no APP_ENV).
jest.mock('@/constants/config', () =>
  Object.defineProperty({ ...jest.requireActual('@/constants/config') }, 'SHOW_TESTING_MENU', { get: () => true }),
);

// The check is unit tested in lib/homeCheck.test.ts; here each test decides its result.
const mockCheck = jest.fn<Promise<ConnectionResult>, []>();
jest.mock('@/lib/homeCheck', () => ({ checkConnection: () => mockCheck() }));

/** Make the next checks wait until resolve(result) is called. */
function holdCheck() {
  let resolve: (result: ConnectionResult) => void = () => {};
  mockCheck.mockImplementation(() => new Promise((r) => (resolve = r)));
  return { resolve: async (result: ConnectionResult) => act(async () => resolve(result)) };
}

const h = strings.home;
const HIDDEN = { includeHiddenElements: true };
const FRIDAY_2PM = new Date(2026, 10, 13, 14, 0);

async function openHome(query = '') {
  await renderRouter('./src/app', { initialUrl: `/home${query}` });
}

const press = async (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const colorOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).color;

beforeEach(() => {
  jest.useFakeTimers({ now: FRIDAY_2PM });
  getSession().reset();
  mockCheck.mockReset().mockResolvedValue('unpaired');
});

afterEach(() => {
  jest.useRealTimers();
});

describe('balloon, GIFs and date (every look)', () => {
  test('greets the user by part of day and name', async () => {
    getSession().setIdentity({ deviceId: 'dev-1', userName: 'Alex', deviceName: 'Pixel 8' });
    await openHome();
    expect(screen.getByText(h.greeting.afternoon('Alex'))).toBeTruthy();
  });

  test('no user name: "friend"', async () => {
    await openHome();
    expect(screen.getByText(h.greeting.afternoon(h.friend))).toBeTruthy();
  });

  test("shows today's quote and puts it in the session", async () => {
    await openHome();
    const quote = quoteForDate(FRIDAY_2PM).text;
    expect(screen.getByText(h.quoteLabel)).toBeTruthy();
    expect(screen.getByText(quote)).toBeTruthy();
    expect(getSession().quote.text).toBe(quote);
  });

  test('shows the date line', async () => {
    await openHome();
    expect(screen.getByText('Friday, Nov 13')).toBeTruthy();
  });

  test('shows the homeLeft, homeRight and homeMain GIFs', async () => {
    await openHome();
    for (const id of ['home-gif-left', 'home-gif-right', 'home-gif-main']) {
      expect(screen.getByTestId(id, HIDDEN)).toBeTruthy();
    }
  });
});

describe('while Home stays open', () => {
  test('the greeting moves from afternoon to evening', async () => {
    jest.setSystemTime(new Date(2026, 10, 13, 17, 59, 30));
    await openHome();
    expect(screen.getByText(h.greeting.afternoon(h.friend))).toBeTruthy();
    await act(async () => jest.advanceTimersByTime(CLOCK_TICK_MS));
    expect(screen.getByText(h.greeting.evening(h.friend))).toBeTruthy();
  });

  test('after midnight: the next date and the next quote', async () => {
    jest.setSystemTime(new Date(2026, 10, 13, 23, 59, 30));
    await openHome();
    await act(async () => jest.advanceTimersByTime(CLOCK_TICK_MS));
    expect(screen.getByText('Saturday, Nov 14')).toBeTruthy();
    expect(screen.getByText(quoteForDate(new Date(2026, 10, 14)).text)).toBeTruthy();
  });
});

describe('layout', () => {
  test('the screen sits on the teal desktop, not the platform grey', async () => {
    await openHome();
    // Walk up from Home's content to the first ancestor with a background colour.
    type Node = { props: { style?: StyleProp<ViewStyle> }; parent: Node | null };
    let node: Node | null = screen.getByTestId('home-content') as unknown as Node;
    let background: ViewStyle['backgroundColor'];
    while (node && background === undefined) {
      background = StyleSheet.flatten(node.props.style)?.backgroundColor;
      node = node.parent;
    }
    expect(background).toBe(colors.desktop);
  });

  test("the big button's width comes from the window, not its label (Android measured the label as nearly zero wide)", async () => {
    await openHome();
    const actions = StyleSheet.flatten(screen.getByTestId('home-actions').props.style);
    expect(actions.alignItems).toBe('stretch');
    expect(actions.paddingHorizontal).toBe(sizes.homeActionInset);
  });
});

describe('checking', () => {
  test('runs the check once when Home opens', async () => {
    await openHome();
    expect(mockCheck).toHaveBeenCalledTimes(1);
  });

  test('meanwhile: connected title, disabled "Checking…" button with the globe, muted status, Upload window', async () => {
    holdCheck();
    await openHome();
    expect(screen.getByText(h.titlePaired)).toBeTruthy();
    expect(screen.getByRole('button', { name: h.checking }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByTestId('home-icon-globe', HIDDEN)).toBeTruthy();
    const status = within(screen.getByTestId('home-status')).getByText(h.checking);
    expect(StyleSheet.flatten(status.props.style).color).toBe(tones.muted);
    expect(screen.getByText(h.uploadPrompt)).toBeTruthy();
  });
});

describe('not connected (check: unpaired)', () => {
  beforeEach(() => openHome());

  test('title, the connect button with the monitor icon, and no Upload window', async () => {
    expect(screen.getByText(h.titleUnpaired)).toBeTruthy();
    expect(screen.getByRole('button', { name: h.connect })).toBeTruthy();
    expect(screen.getByTestId('home-icon-monitor', HIDDEN)).toBeTruthy();
    expect(screen.queryByText(h.uploadPrompt)).toBeNull();
    expect(screen.queryByRole('button', { name: h.viewServerFiles })).toBeNull();
  });

  test('"I want to connect to my PC" goes to Pairing', async () => {
    await press(h.connect);
    expect(screen).toHavePathname('/pairing/scan');
  });

  test('the taskbar shows here too, and Properties opens Properties', async () => {
    await press(strings.taskbar.properties);
    expect(screen).toHavePathname('/properties');
  });
});

describe('connected (check: paired)', () => {
  beforeEach(async () => {
    mockCheck.mockResolvedValue('paired');
    await openHome();
  });

  test('title, View server files with the globe icon, green "Server connected"', async () => {
    expect(screen.getByText(h.titlePaired)).toBeTruthy();
    expect(screen.getByRole('button', { name: h.viewServerFiles })).toBeTruthy();
    expect(screen.getByTestId('home-icon-globe', HIDDEN)).toBeTruthy();
    expect(colorOf(h.serverConnected)).toBe(tones.success);
    expect(screen.queryByRole('button', { name: h.connect })).toBeNull();
  });

  test('View server files goes to Server files', async () => {
    await press(h.viewServerFiles);
    expect(screen).toHavePathname('/server-files');
  });

  test('the Upload window: Yes goes to Upload', async () => {
    const upload = screen.getByTestId('home-upload');
    expect(within(upload).getByText(h.uploadTitle)).toBeTruthy();
    expect(within(upload).getByText(h.uploadPrompt)).toBeTruthy();
    await press(h.yes);
    expect(screen).toHavePathname('/upload');
  });

  test("No is disabled, and the Upload window can't be closed", async () => {
    expect(screen.getByRole('button', { name: h.no }).props.accessibilityState).toMatchObject({ disabled: true });
    const upload = screen.getByTestId('home-upload');
    expect(within(upload).getByRole('button', { name: strings.ui.titleBar.close }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });
});

describe("can't reach (check: serverError)", () => {
  beforeEach(async () => {
    mockCheck.mockResolvedValue('serverError');
    await openHome();
  });

  test("can't-reach title, Retry with its icon, red status, Upload window", async () => {
    expect(screen.getByText(h.titleServerError)).toBeTruthy();
    expect(screen.getByRole('button', { name: h.retry })).toBeTruthy();
    expect(screen.getByTestId('home-icon-retry', HIDDEN)).toBeTruthy();
    expect(colorOf(h.serverError)).toBe(tones.error);
    expect(screen.getByText(h.uploadPrompt)).toBeTruthy();
  });

  test('Retry checks again, shows "Checking…" meanwhile, and stays on Home', async () => {
    const check = holdCheck();
    await press(h.retry);
    expect(mockCheck).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: h.checking })).toBeTruthy();
    expect(screen).toHavePathname('/home');
    await check.resolve('paired');
    expect(screen.getByText(h.serverConnected)).toBeTruthy();
  });
});

describe('testing-menu states', () => {
  test('?state=paired shows the connected look', async () => {
    await openHome('?state=paired');
    expect(screen.getByText(h.serverConnected)).toBeTruthy();
  });

  test('?state=unpaired shows the not-connected look even when the check would say paired', async () => {
    mockCheck.mockResolvedValue('paired');
    await openHome('?state=unpaired');
    expect(screen.getByText(h.titleUnpaired)).toBeTruthy();
  });

  test("?state=serverError: can't-reach title and Retry", async () => {
    await openHome('?state=serverError');
    expect(screen.getByText(h.titleServerError)).toBeTruthy();
    expect(screen.getByRole('button', { name: h.retry })).toBeTruthy();
  });

  test('?state=checking shows the checking look', async () => {
    await openHome('?state=checking');
    expect(screen.getByRole('button', { name: h.checking })).toBeTruthy();
  });

  test.each(['paired', 'unpaired', 'checking', 'serverError'])('?state=%s skips the real check', async (state) => {
    await openHome(`?state=${state}`);
    expect(mockCheck).not.toHaveBeenCalled();
  });
});
