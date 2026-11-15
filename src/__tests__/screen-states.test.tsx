// Every screen honours the testing menu's `state` param (context/details/1020): a valid one
// shows its state line, anything else is ignored, and Landing never reads it.
import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/constants/strings';
import { runStartup } from '@/lib/startup';
import { getSession } from '@/state/session';

// Landing runs start-up on mount; keep it pending so these tests never call the server.
jest.mock('@/lib/startup', () => ({ runStartup: jest.fn(() => new Promise(() => {})) }));

// SHOW_TESTING_MENU is fixed when config.ts loads (and Jest has no APP_ENV, so it's prod);
// a getter added by defineProperty lets each test pick it.
let mockShowMenu = true;
jest.mock('@/constants/config', () =>
  Object.defineProperty({ ...jest.requireActual('@/constants/config') }, 'SHOW_TESTING_MENU', {
    get: () => mockShowMenu,
  }),
);

const APP_DIR = './src/app';
const openAt = (url: string) => renderRouter(APP_DIR, { initialUrl: url });

beforeEach(() => {
  mockShowMenu = true;
  getSession().reset();
  jest.mocked(runStartup).mockClear();
});

test.each([
  ['/register', 'serverError'],
  ['/home', 'paired'],
  ['/pairing/scan', 'cameraNote'],
  ['/pairing/wait', 'error'],
  ['/server-files', 'empty'],
  ['/upload', 'tooLarge'],
  ['/share', 'ready'],
  ['/properties', 'notPaired'],
])('%s?state=%s shows that state', async (path, state) => {
  await openAt(`${path}?state=${state}`);
  expect(screen).toHavePathname(path);
  expect(screen.getByText(strings.dev.stateLine(state))).toBeTruthy();
});

test.each(['/register', '/home', '/upload', '/properties'])('%s ignores a state it does not have', async (path) => {
  await openAt(`${path}?state=bogus`);
  expect(screen.queryByText(strings.dev.stateLine('bogus'))).toBeNull();
});

test('prod builds ignore the state', async () => {
  mockShowMenu = false;
  await openAt('/register?state=serverError');
  expect(screen.getByRole('header', { name: strings.register.title })).toBeTruthy();
  expect(screen.queryByText(strings.dev.stateLine('serverError'))).toBeNull();
});

test('a state never changes the session', async () => {
  await openAt('/home?state=paired');
  expect(getSession().pairedWith).toBeNull();
  expect(screen.getByText(strings.home.unpaired)).toBeTruthy();
});

test('Landing ignores state and runs the real start-up', async () => {
  await openAt('/?state=success');
  expect(screen.getByText(strings.landing.connecting)).toBeTruthy();
  expect(runStartup).toHaveBeenCalled();
  expect(screen.queryByText(strings.dev.stateLine('success'))).toBeNull();
});
