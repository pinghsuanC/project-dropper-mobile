// The Upload screen, "Pending upload" (context/details/1090). Part 1: the queue, picking files,
// the size limit, search, the status bar, the Back window, and every look the testing menu
// opens. Part 2: Upload, the queue and sending state from the session store (so they outlive
// the screen), and the result popups. Part 3: Failed rows, Retry failed, the "N of M sent"
// popup, and failed files dropped on leaving. The send loop itself is tested in lib/sendQueue.
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import * as picker from 'expo-document-picker';
import { router } from 'expo-router';
import { BackHandler, StyleSheet } from 'react-native';

import { MAX_UPLOAD_BYTES } from '@/constants/config';
import { strings } from '@/constants/strings';
import { checkConnection, type ConnectionResult } from '@/lib/homeCheck';
import { sendQueue } from '@/lib/sendQueue';
import type { QueuedFile } from '@/lib/uploadQueue';
import { getSession } from '@/state/session';
import { tones } from '@/theme';

jest.mock('@/lib/homeCheck', () => ({ checkConnection: jest.fn() }));
jest.mock('@/lib/sendQueue', () => ({ sendQueue: jest.fn(async () => {}) }));
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
const sendMock = jest.mocked(sendQueue);

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
  getSession().reset();
  sendMock.mockClear();
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
  // Expo Go scopes expo-file-system to each project's own folders, and the picker's cache copy
  // lands outside them ("Missing 'READ' permission"); the picker's own content:// link is
  // readable, so no copy is asked for (1090).
  test('asks the picker for its own links, not cache copies', async () => {
    await open();
    willPick({ name: 'a.txt', size: 3 });
    await press(u.add);
    expect(pickMock).toHaveBeenCalledWith({ multiple: true, copyToCacheDirectory: false });
  });

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

  test('the queue is kept when leaving the screen and coming back (session store)', async () => {
    await withFiles();
    await act(() => router.dismissTo('/home'));
    await act(() => router.push('/upload'));
    expect(within(list()).getByText('holiday-photo.jpg', HIDDEN)).toBeTruthy();
    expect(within(list()).getByText('report-final.pdf', HIDDEN)).toBeTruthy();
  });
});

const queued = (name: string, change: Partial<QueuedFile> = {}): QueuedFile => ({
  id: `file:///cache/${name}`,
  uri: `file:///cache/${name}`,
  name,
  size: 2048,
  status: 'queued',
  ...change,
});

describe('Upload', () => {
  test('enabled when connected and the queue has files', async () => {
    getSession().setUploadQueue([queued('a.txt')]);
    await open();
    expect(disabled(u.upload)).toBe(false);
  });

  test('disabled while the connection check runs', async () => {
    checkMock.mockReturnValue(new Promise(() => {}));
    getSession().setUploadQueue([queued('a.txt')]);
    await open();
    expect(disabled(u.upload)).toBe(true);
  });

  test.each(['unpaired', 'serverError'] as ConnectionResult[])('disabled when %s', async (result) => {
    checkMock.mockResolvedValue(result);
    getSession().setUploadQueue([queued('a.txt')]);
    await open();
    expect(disabled(u.upload)).toBe(true);
  });

  test('disabled with an empty queue', async () => {
    await open();
    expect(disabled(u.upload)).toBe(true);
  });

  test('pressing it sends the queue', async () => {
    getSession().setUploadQueue([queued('a.txt')]);
    await open();
    await press(u.upload);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});

describe('sending (from the store)', () => {
  const sendingLook = async (current: number) => {
    getSession().setUploadQueue([
      queued('a.txt', { status: current === 0 ? 'waiting' : 'sending', progress: 0.4 }),
      queued('b.txt', { status: 'waiting' }),
    ]);
    getSession().setUploadSending({ run: 1, current, total: 2 });
    await open();
  };

  test('preparing: "Preparing…", the sending GIF, the rolling bar; Add…, Clear all and Upload disabled', async () => {
    await sendingLook(0);
    expect(within(status()).getByText(u.preparing, HIDDEN)).toBeTruthy();
    expect(screen.getByTestId('upload-sending-gif', HIDDEN)).toBeTruthy();
    expect(screen.queryByLabelText(u.search)).toBeNull();
    expect(screen.getByTestId('upload-running')).toBeTruthy();
    expect(disabled(u.sending)).toBe(true);
    expect(disabled(u.add)).toBe(true);
    expect(disabled(u.clearAll)).toBe(true);
  });

  test('a file sending: "Sending 1 of 2", its % on the row, the rest Waiting', async () => {
    await sendingLook(1);
    expect(within(status()).getByText(u.sendingCount(1, 2), HIDDEN)).toBeTruthy();
    expect(within(list()).getByText(u.percent(40), HIDDEN)).toBeTruthy();
    expect(within(list()).getByText(u.waiting, HIDDEN)).toBeTruthy();
  });

  test('progress from the store shows as it changes', async () => {
    await sendingLook(1);
    await act(async () => getSession().updateQueuedFile('file:///cache/a.txt', { progress: 0.9 }));
    expect(within(list()).getByText(u.percent(90), HIDDEN)).toBeTruthy();
  });

  test('when the send ends, the normal look comes back', async () => {
    await sendingLook(1);
    await act(async () => {
      getSession().setUploadSending(null);
      getSession().setUploadQueue([]);
    });
    expect(screen.getByLabelText(u.search)).toBeTruthy();
    expect(screen.queryByTestId('upload-running')).toBeNull();
    expect(within(status()).getByText(u.fileCount(0), HIDDEN)).toBeTruthy();
  });
});

describe('result popups (from the store)', () => {
  test('all sent: the Upload complete popup; OK closes it and clears the outcome', async () => {
    getSession().setUploadOutcome({ kind: 'sent', count: 2 });
    await open();
    expect(screen.getByText(u.popupTitle)).toBeTruthy();
    expect(screen.getByText(u.complete)).toBeTruthy();
    expect(screen.getByText(u.sent(2))).toBeTruthy();
    await press(u.ok);
    expect(dialog()).toBeNull();
    expect(getSession().uploadOutcome).toBeNull();
  });

  test('one file: "1 file sent to your PC."', async () => {
    getSession().setUploadOutcome({ kind: 'sent', count: 1 });
    await open();
    expect(screen.getByText(u.sent(1))).toBeTruthy();
  });

  test('a send that ends while the screen is open shows its popup', async () => {
    await open();
    await act(async () => getSession().setUploadOutcome({ kind: 'sent', count: 3 }));
    expect(screen.getByText(u.sent(3))).toBeTruthy();
  });

  test('partial: the error popup "2 of 3 sent. Please retry." over the Failed row (upload-partial-failed.png)', async () => {
    getSession().setUploadQueue([queued('screen-recording.mp4', { status: 'failed' })]);
    getSession().setUploadOutcome({ kind: 'partial', sent: 2, total: 3 });
    await open();
    expect(screen.getByText(u.popupTitle)).toBeTruthy();
    expect(screen.getByText(u.partial(2, 3))).toBeTruthy();
    const failed = within(list()).getByText(u.failed, HIDDEN);
    expect(StyleSheet.flatten(failed.props.style).color).toBe(tones.error);
  });

  test('OK on the partial popup keeps the failed files', async () => {
    getSession().setUploadQueue([queued('a.txt', { status: 'failed' })]);
    getSession().setUploadOutcome({ kind: 'partial', sent: 0, total: 1 });
    await open();
    await press(u.ok);
    expect(dialog()).toBeNull();
    expect(getSession().uploadQueue.map((f) => f.status)).toEqual(['failed']);
  });

  test('Android Back closes the result popup and clears the outcome', async () => {
    getSession().setUploadOutcome({ kind: 'partial', sent: 1, total: 2 });
    await open();
    await act(async () => backHandlers.at(-1)?.(BACK_EVENT));
    expect(dialog()).toBeNull();
    expect(getSession().uploadOutcome).toBeNull();
  });
});

describe('Retry failed', () => {
  const withFailed = async (connected: ConnectionResult = 'paired') => {
    checkMock.mockResolvedValue(connected);
    getSession().setUploadQueue([queued('a.txt', { status: 'failed' }), queued('b.txt', { status: 'failed' })]);
    await open();
  };

  test('takes the place of Upload; Clear all and Add… are hidden (the prototype\'s partial mode)', async () => {
    await withFailed();
    expect(button(u.retryFailed)).toBeTruthy();
    expect(screen.queryByRole('button', { name: u.upload })).toBeNull();
    expect(screen.queryByRole('button', { name: u.clearAll })).toBeNull();
    expect(screen.queryByRole('button', { name: u.add })).toBeNull();
  });

  test('failed rows have no ✕', async () => {
    await withFailed();
    expect(screen.queryByRole('button', { name: u.remove('a.txt') })).toBeNull();
  });

  test('enabled when connected; pressing it sends the failed files', async () => {
    await withFailed();
    expect(disabled(u.retryFailed)).toBe(false);
    await press(u.retryFailed);
    expect(sendMock).toHaveBeenCalledWith('failed');
  });

  test.each(['unpaired', 'serverError'] as ConnectionResult[])('disabled when %s', async (result) => {
    await withFailed(result);
    expect(disabled(u.retryFailed)).toBe(true);
  });

  test('disabled while the check runs', async () => {
    checkMock.mockReturnValue(new Promise(() => {}));
    getSession().setUploadQueue([queued('a.txt', { status: 'failed' })]);
    await open();
    expect(disabled(u.retryFailed)).toBe(true);
  });

  test('while a retry is sending, the sending look is back (Sending…, Add… and Clear all disabled)', async () => {
    getSession().setUploadQueue([queued('a.txt', { status: 'sending', progress: 0.2 })]);
    getSession().setUploadSending({ run: 1, current: 1, total: 1 });
    await open();
    expect(button(u.sending)).toBeTruthy();
    expect(screen.queryByRole('button', { name: u.retryFailed })).toBeNull();
    expect(disabled(u.add)).toBe(true);
  });

  test('while a send runs, its look wins even next to a Failed file', async () => {
    getSession().setUploadQueue([queued('a.txt', { status: 'failed' }), queued('b.txt', { status: 'sending', progress: 0.3 })]);
    getSession().setUploadSending({ run: 1, current: 1, total: 1 });
    await open();
    expect(button(u.sending)).toBeTruthy();
    expect(screen.queryByRole('button', { name: u.retryFailed })).toBeNull();
  });

  test('once no file is failed, Upload, Clear all and Add… come back', async () => {
    await withFailed();
    await act(async () => getSession().setUploadQueue([]));
    expect(button(u.upload)).toBeTruthy();
    expect(button(u.clearAll)).toBeTruthy();
    expect(button(u.add)).toBeTruthy();
    expect(screen.queryByRole('button', { name: u.retryFailed })).toBeNull();
  });
});

describe('leaving drops failed files (the Back note)', () => {
  const store = () => getSession().uploadQueue.map((f) => `${f.name}:${f.status}`);

  test('Confirm: failed files are dropped; queued ones stay', async () => {
    await renderRouter('./src/app', { initialUrl: '/home' });
    getSession().setUploadQueue([queued('a.txt', { status: 'failed' }), queued('b.txt')]);
    await act(() => router.push('/upload'));
    await press(u.confirm);
    expect(screen).toHavePathname('/home');
    expect(store()).toEqual(['b.txt:queued']);
  });

  test('the main window ✕: failed files are dropped', async () => {
    getSession().setUploadQueue([queued('a.txt', { status: 'failed' })]);
    await open();
    const closes = screen.getAllByRole('button', { name: strings.ui.titleBar.close });
    await fireEvent.press(closes[0]);
    expect(store()).toEqual([]);
  });

  test('going to another screen (the taskbar) drops them too', async () => {
    getSession().setUploadQueue([queued('a.txt', { status: 'failed' })]);
    await open();
    await act(() => router.push('/properties'));
    expect(store()).toEqual([]);
  });

  test('a running send keeps its waiting and sending files', async () => {
    getSession().setUploadQueue([queued('a.txt', { status: 'sending', progress: 0.5 }), queued('b.txt', { status: 'waiting' })]);
    getSession().setUploadSending({ run: 1, current: 1, total: 2 });
    await open();
    await act(() => router.dismissTo('/home'));
    expect(store()).toEqual(['a.txt:sending', 'b.txt:waiting']);
  });

  test('leaving while the "Please retry" popup is open clears it too: no popup over an empty queue on return', async () => {
    getSession().setUploadQueue([queued('a.txt', { status: 'failed' })]);
    getSession().setUploadOutcome({ kind: 'partial', sent: 0, total: 1 });
    await open();
    await act(() => router.push('/properties'));
    expect(getSession().uploadOutcome).toBeNull();
    await act(() => router.push('/upload'));
    expect(screen.queryByText(u.partial(0, 1))).toBeNull();
  });

  test('an "all sent" popup is kept when leaving: it is still true on return', async () => {
    getSession().setUploadOutcome({ kind: 'sent', count: 2 });
    await open();
    await act(() => router.push('/properties'));
    expect(getSession().uploadOutcome).toEqual({ kind: 'sent', count: 2 });
  });

  test('a partial outcome set while away (a send that ended after leaving) shows on return', async () => {
    await open();
    await act(() => router.push('/properties'));
    await act(async () => {
      getSession().setUploadQueue([queued('a.txt', { status: 'failed' })]);
      getSession().setUploadOutcome({ kind: 'partial', sent: 1, total: 2 });
    });
    await act(() => router.push('/upload'));
    expect(screen.getByText(u.partial(1, 2))).toBeTruthy();
    // Behind the popup, so hidden from screen readers until OK. (The first /upload is still in
    // the stack under Properties, so there can be two.)
    expect(screen.getAllByRole('button', { name: u.retryFailed, ...HIDDEN }).length).toBeGreaterThan(0);
  });

  test('staying on the screen keeps them', async () => {
    getSession().setUploadQueue([queued('a.txt', { status: 'failed' })]);
    await open();
    expect(store()).toEqual(['a.txt:failed']);
  });

  test('a testing-menu look never touches the store', async () => {
    getSession().setUploadQueue([queued('real.txt', { status: 'failed' })]);
    await open('?state=partialFailed');
    await act(() => router.dismissTo('/home'));
    expect(store()).toEqual(['real.txt:failed']);
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

  test('partialFailed: Retry failed in place of Upload, disabled (a look never sends)', async () => {
    await open('?state=partialFailed');
    await press(u.ok);
    expect(button(u.retryFailed)).toBeTruthy();
    expect(disabled(u.retryFailed)).toBe(true);
    expect(screen.queryByRole('button', { name: u.add })).toBeNull();
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

  test('a look uses its own mock queue: the store is left alone and Upload sends nothing', async () => {
    getSession().setUploadQueue([queued('real.txt')]);
    await open('?state=tooLarge');
    expect(within(list()).queryByText('real.txt', HIDDEN)).toBeNull();
    await press(u.ok);
    // Connected, with queued mock files: still disabled, a look never sends.
    expect(disabled(u.upload)).toBe(true);
    await press(u.clearAll);
    expect(getSession().uploadQueue).toEqual([queued('real.txt')]);
  });
});
