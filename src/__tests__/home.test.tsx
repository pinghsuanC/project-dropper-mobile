// The Home screen (context/details/1060): its three looks, the balloon, and where each button
// goes. Part 1 (UI and redirection): the look comes from the session's pairedWith, or from a
// testing-menu state.
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { strings } from '@/constants/strings';
import { getSession } from '@/state/session';
import { colors, sizes, tones } from '@/theme';

// Landing runs start-up on mount; keep it pending so nothing calls the server.
jest.mock('@/lib/startup', () => ({ runStartup: jest.fn(() => new Promise(() => {})) }));
// Testing-menu states need SHOW_TESTING_MENU (fixed at import; Jest has no APP_ENV).
jest.mock('@/constants/config', () =>
  Object.defineProperty({ ...jest.requireActual('@/constants/config') }, 'SHOW_TESTING_MENU', { get: () => true }),
);

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

  test('shows the quote of the day from the session', async () => {
    getSession().setQuote('First, solve the problem. Then, write the code.');
    await openHome();
    expect(screen.getByText(h.quoteLabel)).toBeTruthy();
    expect(screen.getByText('First, solve the problem. Then, write the code.')).toBeTruthy();
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

describe('not connected (pairedWith null)', () => {
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

describe('connected (pairedWith set)', () => {
  beforeEach(async () => {
    getSession().setPairedWith({ pcName: 'DESKTOP-01' });
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

describe('testing-menu states', () => {
  test('?state=paired shows the connected look without a paired session', async () => {
    await openHome('?state=paired');
    expect(screen.getByText(h.titlePaired)).toBeTruthy();
    expect(getSession().pairedWith).toBeNull();
  });

  test('?state=unpaired shows the not-connected look even when paired', async () => {
    getSession().setPairedWith({ pcName: 'DESKTOP-01' });
    await openHome('?state=unpaired');
    expect(screen.getByText(h.titleUnpaired)).toBeTruthy();
  });

  test("?state=serverError: can't-reach title, Retry with its icon, red status, Upload window", async () => {
    await openHome('?state=serverError');
    expect(screen.getByText(h.titleServerError)).toBeTruthy();
    expect(screen.getByRole('button', { name: h.retry })).toBeTruthy();
    expect(screen.getByTestId('home-icon-retry', HIDDEN)).toBeTruthy();
    expect(colorOf(h.serverError)).toBe(tones.error);
    expect(screen.getByText(h.uploadPrompt)).toBeTruthy();
  });

  test('Retry goes back to the plain Home (Part 1), which follows the session', async () => {
    await openHome('?state=serverError');
    await press(h.retry);
    await act(async () => {});
    expect(screen).toHavePathname('/home');
    expect(screen.getByText(h.titleUnpaired)).toBeTruthy();
  });
});
