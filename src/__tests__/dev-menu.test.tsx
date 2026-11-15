// The testing menu end to end (context/details/1020): the DEV button on every screen, the
// /dev menu, and both hidden in prod builds.
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router, type Href } from 'expo-router';

import { DEV_ROUTES } from '@/components/dev/devRoutes';
import { strings } from '@/constants/strings';
import { getSession } from '@/state/session';

// Landing runs start-up on mount; keep it pending so these tests never call the server.
jest.mock('@/lib/startup', () => ({ runStartup: jest.fn(() => new Promise(() => {})) }));

// SHOW_TESTING_MENU is fixed when config.ts loads; a getter lets each test pick it. It's
// added with defineProperty: an object spread would copy the getter's value once.
let mockShowMenu = true;
jest.mock('@/constants/config', () =>
  Object.defineProperty({ ...jest.requireActual('@/constants/config') }, 'SHOW_TESTING_MENU', {
    get: () => mockShowMenu,
  }),
);

const APP_DIR = './src/app';
const UNMATCHED = 'Unmatched Route';

beforeEach(() => {
  mockShowMenu = true;
  getSession().reset();
});

const devButton = () => screen.queryByRole('button', { name: strings.dev.buttonLabel });
const openAt = (url: string) => renderRouter(APP_DIR, { initialUrl: url });

const pathOf = (href: Href) => (typeof href === 'string' ? href : href.pathname);
// Menu params are only ever `{ state: string }` (devRoutes.ts).
const paramsOf = (href: Href) => (typeof href === 'string' ? {} : ((href.params ?? {}) as Record<string, string>));

describe('in local and dev builds', () => {
  test.each(['/', '/register', '/home', '/pairing/wait', '/properties'])('%s shows the DEV button', async (url) => {
    await openAt(url);
    expect(devButton()).toBeTruthy();
  });

  test('the menu itself has no DEV button', async () => {
    await openAt('/dev');
    expect(screen.getByText(strings.dev.banner)).toBeTruthy();
    expect(devButton()).toBeNull();
  });

  test('the DEV button opens the menu with no history behind it', async () => {
    await openAt('/register');
    await act(() => router.push('/home'));
    expect(router.canGoBack()).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: strings.dev.buttonLabel }));
    expect(screen).toHavePathname('/dev');
    expect(screen.getByText(strings.dev.banner)).toBeTruthy();
    expect(router.canGoBack()).toBe(false);
  });

  test('the history is cleared from inside a nested stack too (pairing step 2)', async () => {
    await openAt('/home');
    await act(() => router.push('/pairing/scan'));
    await act(() => router.push('/pairing/wait'));

    await fireEvent.press(screen.getByRole('button', { name: strings.dev.buttonLabel }));
    expect(screen).toHavePathname('/dev');
    expect(router.canGoBack()).toBe(false);
  });

  test.each(DEV_ROUTES.flatMap((s) => s.entries).map((e) => [e.label, e.href] as const))(
    '"%s" opens its screen, and Back returns to the menu',
    async (label, href) => {
      await openAt('/dev');
      await fireEvent.press(screen.getByRole('button', { name: label }));

      expect(screen).toHavePathname(pathOf(href));
      expect(screen).toHaveSearchParams(paramsOf(href));
      expect(screen.queryByText(UNMATCHED)).toBeNull();

      await act(() => router.back());
      expect(screen).toHavePathname('/dev');
    },
  );
});

describe('in prod builds', () => {
  beforeEach(() => {
    mockShowMenu = false;
  });

  test.each(['/', '/register', '/home', '/properties'])('%s has no DEV button', async (url) => {
    await openAt(url);
    expect(devButton()).toBeNull();
  });

  test('/dev sends you to Landing without showing the menu', async () => {
    await openAt('/dev');
    expect(screen).toHavePathname('/');
    expect(screen.queryByText(strings.dev.banner)).toBeNull();
  });
});
