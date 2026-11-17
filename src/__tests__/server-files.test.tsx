// The Server files screen ("Server status", context/details/1070): the files this phone sent
// that the PC hasn't downloaded yet, from GET /files/sent, with search, an empty state,
// loading and failure looks, and Back to Home.
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { SentFile } from '@/api/types';
import { strings } from '@/constants/strings';
import { getSession } from '@/state/session';

// Landing runs start-up on mount; keep it pending so nothing calls the server.
jest.mock('@/lib/startup', () => ({ runStartup: jest.fn(() => new Promise(() => {})) }));
// Home (the Back target) runs its connection check; tested in home.test.tsx.
jest.mock('@/lib/homeCheck', () => ({ checkConnection: jest.fn(async () => 'paired') }));
// Testing-menu states need SHOW_TESTING_MENU (fixed at import; Jest has no APP_ENV).
jest.mock('@/constants/config', () =>
  Object.defineProperty({ ...jest.requireActual('@/constants/config') }, 'SHOW_TESTING_MENU', { get: () => true }),
);

// The route is unit tested in api/files.test.ts; here each test decides its answer.
const mockGetSentFiles = jest.fn<Promise<SentFile[]>, []>();
jest.mock('@/api/files', () => ({ getSentFiles: () => mockGetSentFiles() }));

const s = strings.serverFiles;
const NOW = new Date(2026, 10, 13, 18, 0);
const at = (date: Date) => Math.floor(date.getTime() / 1000);

const file = (file_id: string, file_name: string, size: number, created_at: number, status: SentFile['status'] = 'uploaded'): SentFile => ({
  file_id,
  file_name,
  size,
  status,
  receiver_name: 'DESKTOP-01',
  created_at,
});

const FILES: SentFile[] = [
  file('f-1', 'holiday-photo.jpg', 2.3 * 1024 ** 2, at(new Date(2026, 10, 13, 16, 12))),
  file('f-2', 'report-final.pdf', 845 * 1024, at(new Date(2026, 10, 13, 15, 58))),
  file('f-3', 'notes.txt', 2150, at(new Date(2026, 10, 12, 8, 0)), 'pending'),
];

/** Make the next loads wait until resolve() or reject() is called. */
function holdLoad() {
  let resolve: (files: SentFile[]) => void = () => {};
  let reject: (error: Error) => void = () => {};
  mockGetSentFiles.mockImplementation(() => new Promise((res, rej) => ((resolve = res), (reject = rej))));
  return {
    resolve: async (files: SentFile[]) => act(async () => resolve(files)),
    reject: async () => act(async () => reject(new Error('unreachable'))),
  };
}

async function open(query = '') {
  await renderRouter('./src/app', { initialUrl: `/server-files${query}` });
}

const press = async (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const search = async (text: string) => fireEvent.changeText(screen.getByLabelText(s.search), text);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  getSession().reset();
  mockGetSentFiles.mockReset().mockResolvedValue(FILES);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('layout', () => {
  test('the banner GIF, the "Server status" window, the search field and Back', async () => {
    await open();
    expect(screen.getByTestId('server-files-gif', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText(s.title)).toBeTruthy();
    expect(screen.getByLabelText(s.search)).toBeTruthy();
    expect(screen.getByRole('button', { name: s.back })).toBeTruthy();
  });

  test('the taskbar shows here', async () => {
    await open();
    expect(screen.getByRole('button', { name: strings.taskbar.properties })).toBeTruthy();
  });
});

describe('loading the list', () => {
  test('loads once when the screen opens', async () => {
    await open();
    expect(mockGetSentFiles).toHaveBeenCalledTimes(1);
  });

  test('"Loading…" while it loads, then the files in the server\'s order', async () => {
    const load = holdLoad();
    await open();
    expect(screen.getByText(s.loading)).toBeTruthy();
    await load.resolve(FILES);
    expect(screen.queryByText(s.loading)).toBeNull();
    expect(screen.getAllByText(/\.(jpg|pdf|txt)$/).map((n) => n.props.children)).toEqual([
      'holiday-photo.jpg',
      'report-final.pdf',
      'notes.txt',
    ]);
  });

  test('each row: size, type, "Uploaded" + when, and the file status', async () => {
    await open();
    expect(screen.getByText('2.3 MB · JPG · Uploaded Today 4:12 PM · Uploaded')).toBeTruthy();
    expect(screen.getByText('2.1 KB · TXT · Uploaded Yesterday · Pending')).toBeTruthy();
  });

  test('no files: "No files on server"', async () => {
    mockGetSentFiles.mockResolvedValue([]);
    await open();
    expect(screen.getByText(s.empty)).toBeTruthy();
  });

  test('a failed load: "Can\'t reach your server" and Retry, which loads again', async () => {
    mockGetSentFiles.mockRejectedValueOnce(new Error('unreachable'));
    await open();
    expect(screen.getByText(s.loadError)).toBeTruthy();
    const load = holdLoad();
    await press(s.retry);
    expect(mockGetSentFiles).toHaveBeenCalledTimes(2);
    expect(screen.getByText(s.loading)).toBeTruthy();
    await load.resolve(FILES);
    expect(screen.getByText('holiday-photo.jpg')).toBeTruthy();
    expect(screen.queryByRole('button', { name: s.retry })).toBeNull();
  });

  test(`a Retry that fails again: "Can't reach your server" and Retry stay`, async () => {
    mockGetSentFiles.mockRejectedValue(new Error('unreachable'));
    await open();
    await press(s.retry);
    await act(async () => {});
    expect(mockGetSentFiles).toHaveBeenCalledTimes(2);
    expect(screen.getByText(s.loadError)).toBeTruthy();
    expect(screen.getByRole('button', { name: s.retry })).toBeTruthy();
  });

  test('no Retry while the list is fine', async () => {
    await open();
    expect(screen.queryByRole('button', { name: s.retry })).toBeNull();
  });
});

describe('search', () => {
  test('filters by name as you type, ignoring case on both sides', async () => {
    mockGetSentFiles.mockResolvedValue([...FILES, file('f-4', 'IMG_0042.jpg', 1024, at(NOW))]);
    await open();
    await search('PHOTO');
    expect(screen.getByText('holiday-photo.jpg')).toBeTruthy();
    expect(screen.queryByText('report-final.pdf')).toBeNull();
    await search('img');
    expect(screen.getByText('IMG_0042.jpg')).toBeTruthy();
    expect(screen.queryByText('holiday-photo.jpg')).toBeNull();
  });

  test('no match: `No files match "x"`', async () => {
    await open();
    await search('  zebra ');
    expect(screen.getByText(s.noMatch('zebra'))).toBeTruthy();
  });

  test('clearing the search shows every file again', async () => {
    await open();
    await search('photo');
    await search('');
    expect(screen.getByText('notes.txt')).toBeTruthy();
  });
});

describe('leaving', () => {
  test('Back goes to Home', async () => {
    await open();
    await press(s.back);
    expect(screen).toHavePathname('/home');
  });

  test('the title bar ✕ goes to Home', async () => {
    await open();
    await press(strings.ui.titleBar.close);
    expect(screen).toHavePathname('/home');
  });
});

describe('testing-menu states', () => {
  test('?state=files shows a mock list without calling the server', async () => {
    await open('?state=files');
    expect(mockGetSentFiles).not.toHaveBeenCalled();
    expect(screen.queryByText(s.empty)).toBeNull();
    expect(screen.getAllByText(/ · /).length).toBeGreaterThan(1);
  });

  test('?state=empty shows "No files on server" without calling the server', async () => {
    await open('?state=empty');
    expect(mockGetSentFiles).not.toHaveBeenCalled();
    expect(screen.getByText(s.empty)).toBeTruthy();
  });
});
