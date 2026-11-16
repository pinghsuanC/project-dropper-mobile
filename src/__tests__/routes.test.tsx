// Every screen is a route under src/app/, and the placeholders link the flows of the
// screen map in context/details/1000-app.md.
import { fireEvent, renderRouter, screen, testRouter } from 'expo-router/testing-library';

import { strings } from '@/constants/strings';
import { getSession } from '@/state/session';

// Landing runs start-up on mount; keep it pending so these route tests never call the server.
jest.mock('@/lib/startup', () => ({ runStartup: jest.fn(() => new Promise(() => {})) }));

const APP_DIR = './src/app';

beforeEach(() => {
  getSession().reset();
});

async function openAt(url: string) {
  return renderRouter(APP_DIR, { initialUrl: url });
}

// fireEvent is async in @testing-library/react-native 14: await it before checking the path.
async function pressLink(name: string) {
  await fireEvent.press(screen.getByRole('link', { name }));
}

const propertiesLink = () => screen.queryByRole('link', { name: strings.taskbar.properties });

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
  test('shows the unpaired line when no PC is paired', async () => {
    await openAt('/home');
    expect(screen.getByRole('header', { name: strings.home.title })).toBeTruthy();
    expect(screen.getByText(strings.home.unpaired)).toBeTruthy();
  });

  test('shows the paired line from the session', async () => {
    getSession().setPairedWith({ pcName: 'DESKTOP-01' });
    await openAt('/home');
    expect(screen.getByText(strings.home.paired('DESKTOP-01'))).toBeTruthy();
    expect(screen.queryByText(strings.home.unpaired)).toBeNull();
  });

  test.each([
    [strings.home.toPairing, '/pairing/scan'],
    [strings.home.toServerFiles, '/server-files'],
    [strings.home.toUpload, '/upload'],
  ])('"%s" goes to %s', async (label, path) => {
    await openAt('/home');
    await pressLink(label);
    expect(screen).toHavePathname(path);
  });
});

describe('Pairing', () => {
  test('step 1 → step 2 → Home', async () => {
    await openAt('/pairing/scan');
    expect(screen.getByRole('header', { name: strings.pairing.scanTitle })).toBeTruthy();
    await pressLink(strings.pairing.toWait);
    expect(screen).toHavePathname('/pairing/wait');
    expect(screen.getByRole('header', { name: strings.pairing.waitTitle })).toBeTruthy();
    await pressLink(strings.pairing.toHome);
    expect(screen).toHavePathname('/home');
  });
});

describe('other screens', () => {
  test.each([
    ['/server-files', strings.serverFiles.title],
    ['/upload', strings.upload.title],
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
    expect(propertiesLink()).toBeTruthy();
  });

  test('the Properties button goes to /properties', async () => {
    await openAt('/home');
    await pressLink(strings.taskbar.properties);
    expect(screen).toHavePathname('/properties');
  });

  test.each(['/', '/register', '/pairing/scan', '/pairing/wait', '/share', '/properties'])(
    '%s has no Properties button',
    async (path) => {
      await openAt(path);
      expect(screen).toHavePathname(path);
      expect(propertiesLink()).toBeNull();
    },
  );
});

describe('back', () => {
  test('returns to the previous screen', async () => {
    await openAt('/home');
    await pressLink(strings.taskbar.properties);
    expect(screen).toHavePathname('/properties');
    await testRouter.back('/home');
  });
});
