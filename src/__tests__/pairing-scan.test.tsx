// Pairing step 1 (context/details/1080): the screen, the camera-access note, the camera and
// the error. expo-camera is the Jest mock in __mocks__/expo-camera.tsx.
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as expoCamera from 'expo-camera';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';

import { strings } from '@/constants/strings';

// The same module instance the app code gets (a root __mocks__ file).
const { cameraMock, requestCameraPermission } = expoCamera as unknown as typeof import('../../__mocks__/expo-camera');

// Home (the ✕ target) runs its connection check on mount.
jest.mock('@/lib/homeCheck', () => ({ checkConnection: jest.fn(async () => 'unpaired') }));
// The testing-menu states need SHOW_TESTING_MENU (fixed at import; Jest has no APP_ENV).
jest.mock('@/constants/config', () =>
  Object.defineProperty({ ...jest.requireActual('@/constants/config') }, 'SHOW_TESTING_MENU', { get: () => true }),
);

const p = strings.pairing;
const HIDDEN = { includeHiddenElements: true };

const open = (query = '') => renderRouter('./src/app', { initialUrl: `/pairing/scan${query}` });
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const note = () => screen.queryByTestId('pairing-note');
const error = () => screen.queryByTestId('pairing-error');
const camera = () => screen.queryByTestId('camera-view');
const stepOne = () => screen.queryByText(p.scanPrompt);

type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
const BACK_EVENT = {} as Parameters<BackListener>[0];
let backHandlers: BackListener[] = [];
const pressBack = () => act(async () => void backHandlers.at(-1)?.(BACK_EVENT));

beforeEach(() => {
  cameraMock.reset();
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

describe('step 1', () => {
  test('shows the balloon, the warnings, the prompt, Open camera and the notes', async () => {
    await open();
    for (const text of [
      p.balloonTitle,
      p.balloonText,
      p.stepOneTitle,
      p.noShare,
      p.validFor,
      p.scanPrompt,
      p.fingerprintNote,
      p.onePcNote,
    ]) {
      expect(screen.getByText(text, { exact: false })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: p.openCamera })).toBeTruthy();
    expect(camera()).toBeNull();
  });

  test('✕ opened directly: goes to Home', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: strings.ui.titleBar.close }));
    expect(screen).toHavePathname('/home');
  });

  test('✕ after coming from Home: back to that Home, with nothing behind it', async () => {
    await renderRouter('./src/app', { initialUrl: '/home' });
    await act(() => router.push('/pairing/scan'));
    expect(screen).toHavePathname('/pairing/scan');
    await fireEvent.press(screen.getByRole('button', { name: strings.ui.titleBar.close }));
    expect(screen).toHavePathname('/home');
    expect(router.canGoBack()).toBe(false);
  });
});

describe('Open camera', () => {
  test('already allowed: the camera opens straight away', async () => {
    cameraMock.setPermission(cameraMock.GRANTED);
    await open();
    await press(p.openCamera);
    expect(camera()).toBeTruthy();
    expect(note()).toBeNull();
    expect(requestCameraPermission).not.toHaveBeenCalled();
  });

  test('not asked yet: the camera note first, without asking Android', async () => {
    await open();
    await press(p.openCamera);
    expect(note()).toBeTruthy();
    expect(screen.getByText(p.cameraNote)).toBeTruthy();
    expect(camera()).toBeNull();
    expect(requestCameraPermission).not.toHaveBeenCalled();
  });

  test('denied for good: the error, without asking', async () => {
    cameraMock.setPermission(cameraMock.BLOCKED);
    await open();
    await press(p.openCamera);
    expect(error()).toBeTruthy();
    expect(screen.getByText(p.scanError)).toBeTruthy();
    expect(requestCameraPermission).not.toHaveBeenCalled();
  });

  test('permission still loading: nothing happens', async () => {
    cameraMock.setPermission(null);
    await open();
    await press(p.openCamera);
    expect(note()).toBeNull();
    expect(camera()).toBeNull();
    expect(error()).toBeNull();
  });
});

describe('camera note', () => {
  test('Not now closes it and asks nothing', async () => {
    await open();
    await press(p.openCamera);
    await press(p.notNow);
    expect(note()).toBeNull();
    expect(stepOne()).toBeTruthy();
    expect(requestCameraPermission).not.toHaveBeenCalled();
  });

  test('Continue asks Android; allowed → the camera', async () => {
    await open();
    await press(p.openCamera);
    await press(p.continue);
    expect(requestCameraPermission).toHaveBeenCalledTimes(1);
    expect(camera()).toBeTruthy();
    expect(note()).toBeNull();
  });

  test('Continue asks Android; denied → the error, and OK returns to step 1', async () => {
    cameraMock.setAnswer(cameraMock.DENIED);
    await open();
    await press(p.openCamera);
    await press(p.continue);
    expect(error()).toBeTruthy();
    expect(camera()).toBeNull();
    await press(p.ok);
    expect(error()).toBeNull();
    expect(stepOne()).toBeTruthy();
  });

  test('Continue, but asking Android fails: the error, not a stuck note', async () => {
    requestCameraPermission.mockRejectedValueOnce(new Error('no activity'));
    await open();
    await press(p.openCamera);
    await press(p.continue);
    expect(error()).toBeTruthy();
    expect(note()).toBeNull();
    expect(camera()).toBeNull();
  });

  test('step 1 is hidden from screen readers while it is open', async () => {
    await open();
    await press(p.openCamera);
    expect(screen.getByTestId('pairing-step-one', HIDDEN).props.importantForAccessibility).toBe('no-hide-descendants');
  });

  test('Android Back closes it', async () => {
    await open();
    await press(p.openCamera);
    await pressBack();
    expect(note()).toBeNull();
    expect(stepOne()).toBeTruthy();
  });
});

describe('camera', () => {
  async function openCamera() {
    cameraMock.setPermission(cameraMock.GRANTED);
    await open();
    await press(p.openCamera);
  }

  test('shows the scan window: prompt, a progress bar, the looking line and Cancel', async () => {
    await openCamera();
    expect(screen.getByText(p.scanTitle)).toBeTruthy();
    expect(screen.getByText(p.pointCamera)).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByText(p.looking)).toBeTruthy();
    expect(stepOne()).toBeNull();
  });

  test('Cancel returns to step 1', async () => {
    await openCamera();
    await press(p.cancel);
    expect(camera()).toBeNull();
    expect(stepOne()).toBeTruthy();
  });

  test('Android Back returns to step 1', async () => {
    await openCamera();
    await pressBack();
    expect(camera()).toBeNull();
    expect(stepOne()).toBeTruthy();
  });

  test('a scanned code is printed and the camera closes', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await openCamera();
    await act(async () => cameraMock.scan({ type: 'qr', data: 'pairing-code-123' }));
    expect(log).toHaveBeenCalledWith(expect.any(String), 'pairing-code-123');
    expect(camera()).toBeNull();
    expect(stepOne()).toBeTruthy();
  });
});

describe('testing-menu states', () => {
  test.each([
    ['cameraNote', note],
    ['camera', camera],
    ['error', error],
  ])('?state=%s opens that look', async (state, find) => {
    await open(`?state=${state}`);
    expect(find()).toBeTruthy();
  });

  test('a state look still works: Not now from the note returns to step 1', async () => {
    await open('?state=cameraNote');
    await press(p.notNow);
    expect(note()).toBeNull();
    expect(stepOne()).toBeTruthy();
  });
});
