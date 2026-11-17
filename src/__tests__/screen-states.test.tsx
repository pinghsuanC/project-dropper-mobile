// Every screen honours the testing menu's `state` param (context/details/1020): a valid one
// shows its state line, anything else is ignored, and Landing never reads it.
import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/constants/strings';
import { runStartup } from '@/lib/startup';
import { getSession } from '@/state/session';

// Landing runs start-up on mount; keep it pending so these tests never call the server.
jest.mock('@/lib/startup', () => ({ runStartup: jest.fn(() => new Promise(() => {})) }));
// Home's connection check calls the server; its results are tested in home.test.tsx.
jest.mock('@/lib/homeCheck', () => ({ checkConnection: jest.fn(async () => 'unpaired') }));
// Server files loads GET /files/sent; tested in server-files.test.tsx.
jest.mock('@/api/files', () => ({ getSentFiles: jest.fn(async () => []) }));

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

// Register, Home and Server files are built: their states change the screen itself
// (register.test.tsx, home.test.tsx, server-files.test.tsx) instead of showing a state line.
test.each([
  ['/pairing/scan', 'cameraNote'],
  ['/pairing/wait', 'error'],
  ['/upload', 'tooLarge'],
  ['/share', 'ready'],
  ['/properties', 'notPaired'],
])('%s?state=%s shows that state', async (path, state) => {
  await openAt(`${path}?state=${state}`);
  expect(screen).toHavePathname(path);
  expect(screen.getByText(strings.dev.stateLine(state))).toBeTruthy();
});

test.each(['/upload', '/properties'])('%s ignores a state it does not have', async (path) => {
  await openAt(`${path}?state=bogus`);
  expect(screen.queryByText(strings.dev.stateLine('bogus'))).toBeNull();
});

test('Register ignores a state it does not have: no dialog', async () => {
  await openAt('/register?state=bogus');
  expect(screen.getByText(strings.register.title)).toBeTruthy();
  expect(screen.queryByTestId('register-dialog')).toBeNull();
});

test('prod builds ignore the state', async () => {
  mockShowMenu = false;
  await openAt('/upload?state=tooLarge');
  expect(screen.getByRole('header', { name: strings.upload.title })).toBeTruthy();
  expect(screen.queryByText(strings.dev.stateLine('tooLarge'))).toBeNull();
});

test('prod builds ignore Home states: the look follows the check', async () => {
  mockShowMenu = false;
  await openAt('/home?state=paired');
  expect(screen.getByText(strings.home.titleUnpaired)).toBeTruthy();
});

test('prod builds ignore Register states: no dialog', async () => {
  mockShowMenu = false;
  await openAt('/register?state=serverError');
  expect(screen.getByText(strings.register.title)).toBeTruthy();
  expect(screen.queryByTestId('register-dialog')).toBeNull();
});

test('a state never changes the session', async () => {
  await openAt('/home?state=paired');
  expect(screen.getByText(strings.home.titlePaired)).toBeTruthy();
  expect(getSession().pairedWith).toBeNull();
});

test('Landing ignores state and runs the real start-up', async () => {
  await openAt('/?state=success');
  expect(screen.getByText(strings.landing.connecting)).toBeTruthy();
  expect(runStartup).toHaveBeenCalled();
  expect(screen.queryByText(strings.dev.stateLine('success'))).toBeNull();
});
