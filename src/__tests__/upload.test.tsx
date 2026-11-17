// The Upload screen, "Pending upload" (context/details/1090), Part 1: the queue, picking files,
// the size limit, search, the status bar, the Back window, and every look the testing menu
// opens. Sending itself comes in Part 2, so Upload stays disabled here.
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import * as picker from 'expo-document-picker';
import { router } from 'expo-router';
import { BackHandler, StyleSheet } from 'react-native';

import { MAX_UPLOAD_BYTES } from '@/constants/config';
import { strings } from '@/constants/strings';
import { checkConnection, type ConnectionResult } from '@/lib/homeCheck';
import { tones } from '@/theme';

jest.mock('@/lib/homeCheck', () => ({ checkConnection: jest.fn() }));
// Landing runs start-up on mount; keep it pending so nothing calls the server.
jest.mock('@/lib/startup', () => ({ runStartup: jest.fn(() => new Promise(() => {})) }));
// Testing-menu states need SHOW_TESTING_MENU (fixed at import; Jest has no APP_ENV).
jest.mock('@/constants/config', () =>
  Object.defineProperty({ ...jest.requireActual('@/constants/config') }, 'SHOW_TESTING_MENU', { get: () => true }),
);

const u = strings.upload;
const MB = 1024 ** 2;
const checkMock = jest.mocked(checkConnection);
const pickMock = jest.mocked(picker.getDocumentAsync);

type Asset = { name: string; size?: number; mimeType?: string };
function willPick(...assets: Asset[]) {
  pickMock.mockResolvedValueOnce({
    canceled: false,
    assets: assets.map((a, i) => ({ uri: `file:///cache/${i}/${a.name}`, lastModified: 0, ...a })),
  } as Awaited<ReturnType<typeof picker.getDocumentAsync>>);
}

const open = (query = '') => renderRouter('./src/app', { initialUrl: `/upload${query}` });
const button = (name: string) => screen.getByRole('button', { name });
const press = (name: string) => fireEvent.press(button(name));
const disabled = (name: string) => button(name).props.accessibilityState?.disabled === true;
// The list and status bar are hidden from screen readers while a popup is open; tests still look.
const HIDDEN = { includeHiddenElements: true };
const list = () => screen.getByTestId('upload-list', HIDDEN);
const status = () => screen.getByTestId('upload-status', HIDDEN);
const dialog = () => screen.queryByTestId('upload-dialog');

type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
const BACK_EVENT = {} as Parameters<BackListener>[0];
let backHandlers: BackListener[] = [];

beforeEach(() => {
  checkMock.mockReset();
  checkMock.mockResolvedValue('paired');
  pickMock.mockClear();
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

describe('empty start', () => {
  test('the window, the empty list, the buttons and the Back window', async () => {
    await open();
    expect(screen.getByText(u.title)).toBeTruthy();
    expect(screen.getByLabelText(u.search)).toBeTruthy();
    expect(within(list()).getByText(u.empty, HIDDEN)).toBeTruthy();
    expect(screen.getByText(u.backPrompt)).toBeTruthy();
    expect(screen.getByText(u.backNote)).toBeTruthy();
  });

  test('Clear all and Upload are disabled; Add… is enabled', async () => {
    await open();
    expect(disabled(u.clearAll)).toBe(true);
    expect(disabled(u.upload)).toBe(true);
    expect(disabled(u.add)).toBe(false);
  });

  test('the status bar counts 0 files', async () => {
    await open();
    expect(within(status()).getByText(u.fileCount(0), HIDDEN)).toBeTruthy();
  });
});

describe('Add…', () => {
  test('opens the picker for several files, and the picked files join the queue', async () => {
    await open();
    willPick({ name: 'holiday-photo.jpg', size: 2.3 * MB }, { name: 'notes.txt', size: 2048 });
    await press(u.add);
    expect(pickMock).toHaveBeenCalledWith(expect.objectContaining({ multiple: true }));
    expect(within(list()).getByText('holiday-photo.jpg', HIDDEN)).toBeTruthy();
    expect(within(list()).getByText('notes.txt', HIDDEN)).toBeTruthy();
    expect(within(status()).getByText(u.fileCount(2), HIDDEN)).toBeTruthy();
    expect(disabled(u.clearAll)).toBe(false);
  });

  test('a second pick adds to the end', async () => {
    await open();
    willPick({ name: 'a.txt', size: 1 });
    await press(u.add);
    willPick({ name: 'b.txt', size: 2 });
    await press(u.add);
    expect(within(status()).getByText(u.fileCount(2), HIDDEN)).toBeTruthy();
  });

  test('cancelling the picker changes nothing', async () => {
    await open();
    await press(u.add);
    expect(within(list()).getByText(u.empty, HIDDEN)).toBeTruthy();
    expect(dialog()).toBeNull();
  });

  test('a file over 100 MB is not added; the error names it; the others are added', async () => {
    await open();
    willPick({ name: 'holiday-photo.jpg', size: 2.3 * MB }, { name: 'family-video.mov', size: 2.4 * 1024 * MB });
    await press(u.add);
    expect(dialog()).toBeTruthy();
    expect(screen.getByText(u.tooLargeOne('family-video.mov', '2.4 GB', '100 MB'))).toBeTruthy();
    expect(within(list()).getByText('holiday-photo.jpg', HIDDEN)).toBeTruthy();
    expect(within(list()).queryByText('family-video.mov', HIDDEN)).toBeNull();
  });

  test('exactly 100 MB is accepted', async () => {
    await open();
    willPick({ name: 'max.bin', size: MAX_UPLOAD_BYTES });
    await press(u.add);
    expect(dialog()).toBeNull();
    expect(within(list()).getByText('max.bin', HIDDEN)).toBeTruthy();
  });

  test('several too large: the error counts them', async () => {
    await open();
    willPick({ name: 'a.mov', size: 200 * MB }, { name: 'b.mov', size: 300 * MB });
    await press(u.add);
    expect(screen.getByText(u.tooLargeMany(2, '100 MB'))).toBeTruthy();
    expect(within(list()).getByText(u.empty, HIDDEN)).toBeTruthy();
  });

  test('a file without a size is refused with its own message', async () => {
    await open();
    willPick({ name: 'mystery' });
    await press(u.add);
    expect(screen.getByText(u.unknownSizeOne('mystery'))).toBeTruthy();
    expect(within(list()).getByText(u.empty, HIDDEN)).toBeTruthy();
  });

  test('the picker failing shows an error', async () => {
    await open();
    pickMock.mockRejectedValueOnce(new Error('no activity'));
    await press(u.add);
    expect(screen.getByText(u.pickError)).toBeTruthy();
  });

  test('OK closes the error', async () => {
    await open();
    willPick({ name: 'a.mov', size: 200 * MB });
    await press(u.add);
    await press(u.ok);
    expect(dialog()).toBeNull();
  });

  test('Android Back closes the error', async () => {
    await open();
    willPick({ name: 'a.mov', size: 200 * MB });
    await press(u.add);
    await act(async () => void backHandlers.at(-1)?.(BACK_EVENT));
    expect(dialog()).toBeNull();
  });

  test('the screen is hidden from screen readers while a popup is open', async () => {
    await open();
    willPick({ name: 'a.mov', size: 200 * MB });
    await press(u.add);
    expect(screen.getByTestId('upload-content', HIDDEN).props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
  });
});

describe('the queue', () => {
  async function withFiles() {
    await open();
    willPick({ name: 'holiday-photo.jpg', size: 2.3 * MB }, { name: 'report-final.pdf', size: 845 * 1024 });
    await press(u.add);
  }

  test('✕ removes that file', async () => {
    await withFiles();
    await press(u.remove('holiday-photo.jpg'));
    expect(within(list()).queryByText('holiday-photo.jpg', HIDDEN)).toBeNull();
    expect(within(list()).getByText('report-final.pdf', HIDDEN)).toBeTruthy();
    expect(within(status()).getByText(u.fileCount(1), HIDDEN)).toBeTruthy();
  });

  test('Clear all empties it', async () => {
    await withFiles();
    await press(u.clearAll);
    expect(within(list()).getByText(u.empty, HIDDEN)).toBeTruthy();
  });

  test('search filters by name, ignoring case', async () => {
    await withFiles();
    await fireEvent.changeText(screen.getByLabelText(u.search), 'PHOTO');
    expect(within(list()).getByText('holiday-photo.jpg', HIDDEN)).toBeTruthy();
    expect(within(list()).queryByText('report-final.pdf', HIDDEN)).toBeNull();
  });

  test('a search with no match says so', async () => {
    await withFiles();
    await fireEvent.changeText(screen.getByLabelText(u.search), 'zip ');
    expect(within(list()).getByText(u.noMatch('zip'), HIDDEN)).toBeTruthy();
  });

  test('Upload stays disabled (sending comes in Part 2)', async () => {
    await withFiles();
    expect(disabled(u.upload)).toBe(true);
  });
});

describe('connection in the status bar', () => {
  test('Checking… while the check runs', async () => {
    checkMock.mockReturnValue(new Promise(() => {}));
    await open();
    expect(within(status()).getByText(u.checking, HIDDEN)).toBeTruthy();
  });

  test.each([
    ['paired', u.connected],
    ['unpaired', u.notConnected],
    ['serverError', u.serverError],
  ] as [ConnectionResult, string][])('%s → %s', async (result, text) => {
    checkMock.mockResolvedValue(result);
    await open();
    expect(within(status()).getByText(text, HIDDEN)).toBeTruthy();
  });

  test('Connected has the green dot', async () => {
    await open();
    expect(within(status()).getAllByTestId(/-dot-/, HIDDEN)).toHaveLength(1);
  });

  test.each(['unpaired', 'serverError'] as ConnectionResult[])('%s has no dot', async (result) => {
    checkMock.mockResolvedValue(result);
    await open();
    expect(within(status()).queryAllByTestId(/-dot-/, HIDDEN)).toHaveLength(0);
  });

  // React 19 ignores updates to a closed screen, so this can't see the `current` guard itself;
  // it covers the path and checks nothing errors.
  test('a result that comes after leaving the screen causes no error', async () => {
    let finish!: (result: ConnectionResult) => void;
    checkMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const errors = jest.spyOn(console, 'error');
    const view = await open();
    await view.unmount();
    await act(async () => finish('paired'));
    expect(errors).not.toHaveBeenCalled();
  });

  test('the check runs once when the screen opens', async () => {
    await open();
    expect(checkMock).toHaveBeenCalledTimes(1);
  });
});

describe('leaving', () => {
  test('Confirm goes Home', async () => {
    await renderRouter('./src/app', { initialUrl: '/home' });
    await act(() => router.push('/upload'));
    await press(u.confirm);
    expect(screen).toHavePathname('/home');
  });

  test('Cancel is disabled', async () => {
    await open();
    expect(disabled(u.cancel)).toBe(true);
  });

  test('the main window ✕ goes Home', async () => {
    await open();
    const closes = screen.getAllByRole('button', { name: strings.ui.titleBar.close });
    await fireEvent.press(closes[0]);
    expect(screen).toHavePathname('/home');
  });
});

describe('testing-menu looks', () => {
  test('inProgress: the sending GIF instead of search, %, Waiting, a rolling bar, Sending…', async () => {
    await open('?state=inProgress');
    expect(screen.queryByLabelText(u.search)).toBeNull();
    expect(screen.getByTestId('upload-sending-gif', HIDDEN)).toBeTruthy();
    expect(within(list()).getByText(u.percent(45), HIDDEN)).toBeTruthy();
    expect(within(list()).getByText(u.waiting, HIDDEN)).toBeTruthy();
    expect(screen.getByTestId('upload-running')).toBeTruthy();
    expect(button(u.sending)).toBeTruthy();
    expect(disabled(u.sending)).toBe(true);
    expect(disabled(u.add)).toBe(true);
    expect(disabled(u.clearAll)).toBe(true);
    expect(within(status()).getByText(u.sendingCount(2, 3), HIDDEN)).toBeTruthy();
  });

  test('no rolling bar when nothing is sending', async () => {
    await open();
    expect(screen.queryByTestId('upload-running')).toBeNull();
  });

  test('partialFailed: a Failed row and the "2 of 3 sent" popup', async () => {
    await open('?state=partialFailed');
    const failed = within(list()).getByText(u.failed, HIDDEN);
    expect(StyleSheet.flatten(failed.props.style).color).toBe(tones.error);
    expect(screen.getByText(u.partial(2, 3))).toBeTruthy();
    expect(screen.getByText(u.popupTitle)).toBeTruthy();
  });

  test('tooLarge: the too-large popup over a short queue', async () => {
    await open('?state=tooLarge');
    expect(screen.getByText(u.tooLargeOne('family-video.mov', '2.4 GB', '100 MB'))).toBeTruthy();
    expect(within(list()).getByText('holiday-photo.jpg', HIDDEN)).toBeTruthy();
  });

  test('success: the Upload complete popup over an empty queue; OK closes it', async () => {
    await open('?state=success');
    expect(screen.getByText(u.complete)).toBeTruthy();
    expect(screen.getByText(u.sent(3))).toBeTruthy();
    expect(within(list()).getByText(u.empty, HIDDEN)).toBeTruthy();
    await press(u.ok);
    expect(dialog()).toBeNull();
  });

  test('a look does not run the connection check: it shows Connected', async () => {
    await open('?state=inProgress');
    expect(checkMock).not.toHaveBeenCalled();
    expect(within(status()).getByText(u.connected, HIDDEN)).toBeTruthy();
  });
});
