// Every screen is a route under src/app/, and the placeholders link the flows of the
// screen map in context/details/1000-app.md.
import { fireEvent, renderRouter, screen, testRouter } from 'expo-router/testing-library';

import { strings } from '@/constants/strings';
import { getSession } from '@/state/session';

// Landing runs start-up on mount; keep it pending so these route tests never call the server.
jest.mock('@/lib/startup', () => ({ runStartup: jest.fn(() => new Promise(() => {})) }));
// Home's connection check calls the server; its results are tested in home.test.tsx.
jest.mock('@/lib/homeCheck', () => ({ checkConnection: jest.fn(async () => 'unpaired') }));
// Server files loads GET /files/sent; tested in server-files.test.tsx.
jest.mock('@/api/files', () => ({ getSentFiles: jest.fn(async () => []) }));
// "Checking…" isn't held here; that wait is tested in home.test.tsx and upload.test.tsx.
jest.mock('@/constants/config', () => ({ ...jest.requireActual('@/constants/config'), MIN_CHECKING_MS: 0 }));

const APP_DIR = './src/app';

beforeEach(() => {
  getSession().reset();
});

async function openAt(url: string) {
  return renderRouter(APP_DIR, { initialUrl: url });
}

// The Taskbar's Properties is a button (1060), not a link.
const propertiesButton = () => screen.queryByRole('button', { name: strings.taskbar.properties });

describe('Landing', () => {
  test('the app opens on Landing: the DROPPER.EXE terminal', async () => {
    await openAt('/');
    expect(screen).toHavePathname('/');
    expect(screen.getByText(strings.ui.terminalTitle)).toBeTruthy();
    expect(screen.getByText(strings.landing.connecting)).toBeTruthy();
  });

  // Its start-up outcomes and redirects are in landing.test.tsx.
});

describe('Register', () => {
  test('opens the Register window', async () => {
    await openAt('/register');
    expect(screen).toHavePathname('/register');
    expect(screen.getByText(strings.register.title)).toBeTruthy();
  });

  // Its form, flow and where it goes next are in register.test.tsx.
});

describe('Home', () => {
  test('opens Home, not connected when the check finds no PC', async () => {
    await openAt('/home');
    expect(screen).toHavePathname('/home');
    expect(screen.getByText(strings.home.titleUnpaired)).toBeTruthy();
  });

  // Its looks, balloon and buttons are in home.test.tsx.
});

describe('Pairing', () => {
  // Both steps are built: their looks are in pairing-scan.test.tsx and pairing-wait.test.tsx.
  test('step 1 renders its window', async () => {
    await openAt('/pairing/scan');
    expect(screen.getByText(strings.pairing.stepOneTitle)).toBeTruthy();
  });

  test('step 2 opened with no code: its error, and Back goes to step 1', async () => {
    await openAt('/pairing/wait');
    expect(screen.getByText(strings.pairing.claimError)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: strings.pairing.back }));
    expect(screen).toHavePathname('/pairing/scan');
  });
});

describe('other screens', () => {
  test('/server-files renders its window title', async () => {
    await openAt('/server-files');
    expect(screen).toHavePathname('/server-files');
    expect(screen.getByText(strings.serverFiles.title)).toBeTruthy();
  });

  test('/upload renders its window title', async () => {
    await openAt('/upload');
    expect(screen).toHavePathname('/upload');
    expect(screen.getByText(strings.upload.title)).toBeTruthy();
  });

  test.each([
    ['/share', strings.share.title],
    ['/properties', strings.properties.title],
  ])('%s renders its title', async (path, title) => {
    await openAt(path);
    expect(screen).toHavePathname(path);
    expect(screen.getByRole('header', { name: title })).toBeTruthy();
  });
});

describe('taskbar', () => {
  test.each(['/home', '/server-files', '/upload'])('%s shows the Properties button', async (path) => {
    await openAt(path);
    expect(propertiesButton()).toBeTruthy();
  });

  test('the Properties button goes to /properties', async () => {
    await openAt('/home');
    await fireEvent.press(propertiesButton()!);
    expect(screen).toHavePathname('/properties');
  });

  test.each(['/', '/register', '/pairing/scan', '/pairing/wait', '/share', '/properties'])(
    '%s has no Properties button',
    async (path) => {
      await openAt(path);
      expect(screen).toHavePathname(path);
      expect(propertiesButton()).toBeNull();
    },
  );
});

describe('back', () => {
  test('returns to the previous screen', async () => {
    await openAt('/home');
    await fireEvent.press(propertiesButton()!);
    expect(screen).toHavePathname('/properties');
    await testRouter.back('/home');
  });
});
