// The Register screen (context/details/1050). The flow itself (lib/register) is mocked here
// and tested in register.test.ts; this file checks what the screen shows and does.
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { BackHandler, StyleSheet } from 'react-native';

import { NAME_MAX_LENGTH, REGISTERED_REDIRECT_MS } from '@/constants/config';
import { strings } from '@/constants/strings';
import { registerPhone, type RegisterOutcome, type RegisterStep } from '@/lib/register';
import { tones } from '@/theme';

jest.mock('@/lib/register', () => ({
  ...jest.requireActual('@/lib/register'),
  registerPhone: jest.fn(),
}));
// Landing (where loginFailed goes) runs start-up on mount; keep it pending.
jest.mock('@/lib/startup', () => ({ runStartup: jest.fn(() => new Promise(() => {})) }));
jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  const replace = jest.fn((...args: unknown[]) => actual.router.replace(...args));
  return { ...actual, router: { ...actual.router, replace } };
});
// The testing-menu states need SHOW_TESTING_MENU (fixed at import; Jest has no APP_ENV).
jest.mock('@/constants/config', () =>
  Object.defineProperty({ ...jest.requireActual('@/constants/config') }, 'SHOW_TESTING_MENU', { get: () => true }),
);

const t = strings.register;
const registerMock = jest.mocked(registerPhone);
const HIDDEN = { includeHiddenElements: true };

/** A register call that finishes only when the test says so, reporting its steps. */
function deferred() {
  let resolve!: (outcome: RegisterOutcome) => void;
  let onStep: ((step: RegisterStep) => void) | undefined;
  registerMock.mockImplementation((_names, step) => {
    onStep = step;
    return new Promise((r) => {
      resolve = r;
    });
  });
  return {
    step: async (s: RegisterStep) => act(async () => onStep?.(s)),
    finish: async (outcome: RegisterOutcome) => act(async () => resolve(outcome)),
  };
}

async function openRegister(query = '') {
  await renderRouter('./src/app', { initialUrl: `/register${query}` });
}

const userField = () => screen.getByLabelText(t.userNameLabel);
const deviceField = () => screen.getByLabelText(t.deviceNameLabel);
const submit = () => screen.getByRole('button', { name: t.submit });
const dialog = () => screen.getByTestId('register-dialog');
const color = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).color;

async function fillAndSubmit(userName = 'Alex', deviceName = 'Pixel 8') {
  await fireEvent.changeText(userField(), userName);
  await fireEvent.changeText(deviceField(), deviceName);
  await fireEvent.press(submit());
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
/** What RN passes a back listener; the screen doesn't read it. */
const BACK_EVENT = {} as Parameters<BackListener>[0];
let backHandlers: BackListener[] = [];

beforeEach(() => {
  jest.useFakeTimers();
  registerMock.mockReset();
  (router.replace as jest.Mock).mockClear();
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

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Android's Back button: the newest handler first, as RN does. Returns whether it was handled. */
async function pressBack(): Promise<boolean> {
  let handled = false;
  await act(async () => {
    for (const handler of [...backHandlers].reverse()) {
      if (handler(BACK_EVENT)) {
        handled = true;
        break;
      }
    }
  });
  return handled;
}

// --- the form ------------------------------------------------------------------------------

describe('the form', () => {
  test('shows the banner GIF, window, intro, both fields and the button', async () => {
    await openRegister();
    expect(screen.getByTestId('register-banner', HIDDEN)).toBeTruthy();
    expect(screen.getByText(t.title)).toBeTruthy();
    expect(screen.getByText(t.intro)).toBeTruthy();
    expect(userField().props.value).toBe('');
    expect(userField().props.placeholder).toBe(t.userNamePlaceholder);
    expect(screen.getByText(t.userNameHint)).toBeTruthy();
    expect(deviceField().props.value).toBe(t.deviceNameDefault);
    expect(screen.getByText(t.deviceNameHint)).toBeTruthy();
    expect(submit()).toBeTruthy();
  });

  test('counters start at 0/20 and n/20 for the default device name', async () => {
    await openRegister();
    expect(screen.getByText(strings.ui.textField.count(0, NAME_MAX_LENGTH))).toBeTruthy();
    expect(
      screen.getByText(strings.ui.textField.count(Array.from(t.deviceNameDefault).length, NAME_MAX_LENGTH)),
    ).toBeTruthy();
  });

  test("the window's title-bar buttons are all disabled", async () => {
    await openRegister();
    const { minimize, maximize, close } = strings.ui.titleBar;
    for (const name of [minimize, maximize, close]) {
      expect(screen.getByRole('button', { name }).props.accessibilityState).toMatchObject({ disabled: true });
    }
  });

  test('both fields drop characters the name rule rejects', async () => {
    await openRegister();
    await fireEvent.changeText(userField(), 'Al!ex');
    await fireEvent.changeText(deviceField(), 'Pixel  8 📱');
    expect(userField().props.value).toBe('Alex');
    expect(deviceField().props.value).toBe('Pixel 8 ');
  });

  test('both fields stop at 20 characters', async () => {
    await openRegister();
    await fireEvent.changeText(userField(), 'a'.repeat(30));
    await fireEvent.changeText(deviceField(), 'b'.repeat(30));
    expect(userField().props.value).toBe('a'.repeat(NAME_MAX_LENGTH));
    expect(deviceField().props.value).toBe('b'.repeat(NAME_MAX_LENGTH));
  });
});

// --- validation ----------------------------------------------------------------------------

describe('validation', () => {
  test('empty user name: red message, no register call', async () => {
    await openRegister();
    await fillAndSubmit('   ', 'Pixel 8');
    expect(screen.getByText(t.userNameRequired)).toBeTruthy();
    expect(color(t.userNameRequired)).toBe(tones.error);
    expect(registerMock).not.toHaveBeenCalled();
  });

  test('user name is checked first', async () => {
    await openRegister();
    await fillAndSubmit('', '');
    expect(screen.getByText(t.userNameRequired)).toBeTruthy();
    expect(screen.queryByText(t.deviceNameRequired)).toBeNull();
  });

  test('empty device name: red message, no register call', async () => {
    await openRegister();
    await fillAndSubmit('Alex', '  ');
    expect(screen.getByText(t.deviceNameRequired)).toBeTruthy();
    expect(color(t.deviceNameRequired)).toBe(tones.error);
    expect(registerMock).not.toHaveBeenCalled();
  });

  test('names are trimmed before registering', async () => {
    deferred();
    await openRegister();
    await fillAndSubmit(' Alex ', 'Pixel 8 ');
    expect(registerMock).toHaveBeenCalledWith({ userName: 'Alex', deviceName: 'Pixel 8' }, expect.any(Function));
  });
});

// --- registering ---------------------------------------------------------------------------

describe('registering', () => {
  test('disables both fields and the button while it runs', async () => {
    deferred();
    await openRegister();
    await fillAndSubmit();
    expect(userField().props.editable).toBe(false);
    expect(deviceField().props.editable).toBe(false);
    expect(submit().props.accessibilityState).toMatchObject({ disabled: true });
  });

  test('two taps before the screen re-renders start only one registration', async () => {
    deferred();
    await openRegister();
    await fireEvent.changeText(userField(), 'Alex');
    const button = submit();
    // Both presses land in the same frame: the disabled state hasn't been rendered yet.
    await act(async () => {
      void fireEvent.press(button);
      void fireEvent.press(button);
    });
    expect(registerMock).toHaveBeenCalledTimes(1);
  });

  test('after a dialog closes, the button registers again', async () => {
    const run = deferred();
    await openRegister();
    await fillAndSubmit();
    await run.finish({ kind: 'unreachable' });
    await fireEvent.press(screen.getByRole('button', { name: t.ok }));
    deferred();
    await fireEvent.press(submit());
    expect(registerMock).toHaveBeenCalledTimes(2);
  });

  test('shows each step in the status line', async () => {
    const run = deferred();
    await openRegister();
    await fillAndSubmit();
    await run.step('keys');
    expect(screen.getByText(t.creatingKeys)).toBeTruthy();
    await run.step('registering');
    expect(screen.getByText(t.registering)).toBeTruthy();
    expect(screen.queryByText(t.creatingKeys)).toBeNull();
  });

  test('registered: green "Registered!", then Home after the delay, replacing Register', async () => {
    const run = deferred();
    await openRegister();
    await fillAndSubmit();
    await run.finish({ kind: 'registered' });
    expect(screen.getByText(t.registered)).toBeTruthy();
    expect(color(t.registered)).toBe(tones.success);
    await advance(REGISTERED_REDIRECT_MS - 1);
    expect(screen).toHavePathname('/register');
    await advance(1);
    expect(router.replace).toHaveBeenCalledWith('/home');
    expect(screen).toHavePathname('/home');
  });

  test('loginFailed: straight to Landing, no dialog', async () => {
    const run = deferred();
    await openRegister();
    await fillAndSubmit();
    await run.finish({ kind: 'loginFailed' });
    expect(screen.queryByTestId('register-dialog')).toBeNull();
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(screen).toHavePathname('/');
  });
});

// --- errors --------------------------------------------------------------------------------

describe('error dialogs', () => {
  test('unreachable: the "couldn\'t reach" dialog with no code box', async () => {
    const run = deferred();
    await openRegister();
    await fillAndSubmit();
    await run.finish({ kind: 'unreachable' });
    const open = dialog();
    expect(within(open).getByText(t.unreachable)).toBeTruthy();
    expect(within(open).getAllByText(strings.ui.dialog.error)).toHaveLength(2);
    expect(within(open).queryByText(strings.ui.dialog.code)).toBeNull();
  });

  test('rejected: the server-error dialog with the code and details', async () => {
    const run = deferred();
    await openRegister();
    await fillAndSubmit();
    await run.finish({ kind: 'rejected', status: 409, detail: 'Public key already registered' });
    const open = dialog();
    expect(within(open).getByText(t.serverError)).toBeTruthy();
    expect(within(open).getByText('409')).toBeTruthy();
    expect(within(open).getByText('Public key already registered')).toBeTruthy();
  });

  test('rejected with no detail: only the Code row', async () => {
    const run = deferred();
    await openRegister();
    await fillAndSubmit();
    await run.finish({ kind: 'rejected', status: 400 });
    expect(screen.getByText(strings.ui.dialog.code)).toBeTruthy();
    expect(screen.queryByText(strings.ui.dialog.details)).toBeNull();
  });

  test('the form is hidden from screen readers while a dialog is open, and shown again after', async () => {
    const run = deferred();
    await openRegister();
    await fillAndSubmit();
    expect(screen.getByTestId('register-content', HIDDEN).props.importantForAccessibility).toBe('auto');
    await run.finish({ kind: 'unreachable' });
    expect(screen.getByTestId('register-content', HIDDEN).props.importantForAccessibility).toBe('no-hide-descendants');
    await fireEvent.press(screen.getByRole('button', { name: t.ok }));
    expect(screen.getByTestId('register-content', HIDDEN).props.importantForAccessibility).toBe('auto');
  });

  test.each([
    ['OK', async () => fireEvent.press(screen.getByRole('button', { name: t.ok }))],
    ['✕', async () => fireEvent.press(screen.getByRole('button', { name: strings.ui.titleBar.close }))],
    ['Back', async () => expect(await pressBack()).toBe(true)],
  ])('%s closes the dialog, re-enables the form and clears the status', async (_label, close) => {
    const run = deferred();
    await openRegister();
    await fillAndSubmit();
    await run.step('registering');
    await run.finish({ kind: 'rejected', status: 409 });
    await close();
    expect(screen.queryByTestId('register-dialog')).toBeNull();
    expect(screen.queryByText(t.registering)).toBeNull();
    expect(userField().props.editable).toBe(true);
    expect(submit().props.accessibilityState).toMatchObject({ disabled: false });
    expect(screen).toHavePathname('/register');
  });

  test('with no dialog open, Back is left to the router', async () => {
    await openRegister();
    expect(await pressBack()).toBe(false);
  });

  test('the names typed stay after the dialog closes, so pressing again retries them', async () => {
    const run = deferred();
    await openRegister();
    await fillAndSubmit('Alex', 'Pixel 8');
    await run.finish({ kind: 'unreachable' });
    await fireEvent.press(screen.getByRole('button', { name: t.ok }));
    expect(userField().props.value).toBe('Alex');
    expect(deviceField().props.value).toBe('Pixel 8');
  });
});

// --- testing menu --------------------------------------------------------------------------

describe('testing-menu states', () => {
  test('?state=unreachable opens with the unreachable dialog', async () => {
    await openRegister('?state=unreachable');
    expect(within(dialog()).getByText(t.unreachable)).toBeTruthy();
    expect(registerMock).not.toHaveBeenCalled();
  });

  test('?state=serverError opens with the server-error dialog and sample code and details', async () => {
    await openRegister('?state=serverError');
    const open = dialog();
    expect(within(open).getByText(t.serverError)).toBeTruthy();
    expect(within(open).getByText(strings.dev.registerSampleCode)).toBeTruthy();
    expect(within(open).getByText(strings.dev.registerSampleDetails)).toBeTruthy();
  });

  test('OK closes a test-state dialog and leaves the form usable', async () => {
    await openRegister('?state=unreachable');
    await fireEvent.press(screen.getByRole('button', { name: t.ok }));
    expect(screen.queryByTestId('register-dialog')).toBeNull();
    expect(submit().props.accessibilityState).toMatchObject({ disabled: false });
  });
});
