import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { strings } from '@/constants/strings';

import { DEV_ROUTES } from './devRoutes';
import { DevMenu } from './DevMenu';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const { minimize, maximize, close } = strings.ui.titleBar;

beforeEach(() => {
  jest.mocked(router.push).mockClear();
});

test('shows the DEV ONLY banner and the footer', async () => {
  await render(<DevMenu />);
  expect(screen.getByText(strings.dev.banner)).toBeTruthy();
  expect(screen.getByText(strings.dev.footer)).toBeTruthy();
});

test('shows a window per section with a button per entry', async () => {
  await render(<DevMenu />);
  for (const section of DEV_ROUTES) {
    const window = screen.getByTestId(`dev-section-${section.title}`);
    expect(within(window).getAllByText(section.title).length).toBeGreaterThan(0);
    for (const entry of section.entries) {
      expect(within(window).getByRole('button', { name: entry.label })).toBeTruthy();
    }
  }
});

test("the section windows' title-bar buttons are all disabled", async () => {
  await render(<DevMenu />);
  for (const name of [minimize, maximize, close]) {
    const buttons = screen.getAllByRole('button', { name });
    expect(buttons).toHaveLength(DEV_ROUTES.length);
    for (const button of buttons) expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  }
});

test('lays buttons out two per row; an odd last one gets a row to itself', async () => {
  await render(<DevMenu />);
  for (const section of DEV_ROUTES) {
    const rows = screen.getAllByTestId(new RegExp(`^dev-row-${section.title}-\\d+$`));
    expect(rows).toHaveLength(Math.ceil(section.entries.length / 2));
    const last = rows[rows.length - 1];
    const expectedInLast = section.entries.length % 2 === 0 ? 2 : 1;
    expect(within(last).getAllByRole('button')).toHaveLength(expectedInLast);
  }
});

test('scrolls when taller than the screen', async () => {
  await render(<DevMenu />);
  expect(screen.getByTestId('dev-menu').type).toBe('RCTScrollView');
});

test('tapping an entry opens its screen on top of the menu', async () => {
  await render(<DevMenu />);
  for (const entry of DEV_ROUTES.flatMap((s) => s.entries)) {
    await fireEvent.press(screen.getByRole('button', { name: entry.label }));
    expect(router.push).toHaveBeenLastCalledWith(entry.href);
  }
});
