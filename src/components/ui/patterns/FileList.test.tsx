// FileList (2010), the server variant: a ListBox of files, each with its name (cut to
// FILE_NAME_MAX) and a "size · type · Uploaded when" line, plus the file's status when it has one.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/constants/strings';
import { tones } from '@/theme';

import { FileList, type FileRow, type UploadRow } from './FileList';

const NOW = new Date(2026, 10, 13, 18, 0);
const at = (date: Date) => Math.floor(date.getTime() / 1000);

const FILES: FileRow[] = [
  { id: 'f-1', name: 'holiday-photo.jpg', size: 2.3 * 1024 ** 2, createdAt: at(new Date(2026, 10, 13, 16, 12)) },
  { id: 'f-2', name: 'IMG_20261110_093512.jpg', size: 3.2 * 1024 ** 2, createdAt: at(new Date(2026, 10, 10, 9, 35)) },
  { id: 'f-3', name: 'notes.txt', size: 2150, createdAt: at(new Date(2026, 10, 12, 8, 0)), status: 'Pending' },
];

async function show(files = FILES) {
  await render(<FileList files={files} emptyText="No files" now={NOW} testID="files" />);
}

it('each row: the name and a "size · type · Uploaded when" line', async () => {
  await show();
  expect(screen.getByText('holiday-photo.jpg')).toBeTruthy();
  expect(screen.getByText('2.3 MB · JPG · Uploaded Today 4:12 PM')).toBeTruthy();
});

it('cuts long names but keeps the full name for screen readers', async () => {
  await show();
  expect(screen.getByText('IMG_20261110_093512.…')).toBeTruthy();
  const detail = '3.2 MB · JPG · Uploaded Nov 10';
  expect(screen.getByLabelText(strings.format.rowLabel('IMG_20261110_093512.jpg', detail))).toBeTruthy();
});

it('a row with a status shows it after the date, in the same muted tone', async () => {
  await show();
  const line = screen.getByText('2.1 KB · TXT · Uploaded Yesterday · Pending');
  expect(StyleSheet.flatten(line.props.style).color).toBe(tones.muted);
});

it('a name without an extension leaves the type out', async () => {
  await show([{ ...FILES[0], name: 'Makefile' }]);
  expect(screen.getByText('2.3 MB · Uploaded Today 4:12 PM')).toBeTruthy();
});

it('shows emptyText when there are no files', async () => {
  await show([]);
  expect(screen.getByText('No files')).toBeTruthy();
});

describe('upload variant', () => {
  const rows: UploadRow[] = [
    { id: 'u-1', name: 'holiday-photo.jpg', size: 2.3 * 1024 ** 2, status: 'queued' },
    { id: 'u-2', name: 'report-final.pdf', size: 845 * 1024, status: 'sending', progress: 0.45 },
    { id: 'u-3', name: 'screen-recording.mp4', size: 48 * 1024 ** 2, status: 'waiting' },
    { id: 'u-4', name: 'notes.txt', size: 2048, status: 'failed' },
  ];
  const u = strings.upload;

  async function showUpload(onRemove = jest.fn()) {
    await render(<FileList variant="upload" files={rows} onRemove={onRemove} emptyText="Empty" testID="q" />);
    return onRemove;
  }

  it('each row shows the name and the size', async () => {
    await showUpload();
    expect(screen.getByText('holiday-photo.jpg')).toBeTruthy();
    expect(screen.getByText('2.3 MB')).toBeTruthy();
  });

  it('a queued row has a ✕ that removes it', async () => {
    const onRemove = await showUpload();
    await fireEvent.press(screen.getByRole('button', { name: u.remove('holiday-photo.jpg') }));
    expect(onRemove).toHaveBeenCalledWith('u-1');
  });

  it('only queued rows have a ✕', async () => {
    await showUpload();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('the row being sent shows its percent and a mini bar with that value', async () => {
    await showUpload();
    expect(screen.getByText(u.percent(45))).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 45 });
  });

  it('a waiting row says Waiting, muted', async () => {
    await showUpload();
    expect(StyleSheet.flatten(screen.getByText(u.waiting).props.style).color).toBe(tones.muted);
  });

  it('a failed row says Failed, in the error tone', async () => {
    await showUpload();
    expect(StyleSheet.flatten(screen.getByText(u.failed).props.style).color).toBe(tones.error);
  });

  it('each row is one screen-reader stop with its name, size and status', async () => {
    await showUpload();
    expect(screen.getByLabelText(u.rowLabel('holiday-photo.jpg', '2.3 MB'))).toBeTruthy();
    expect(screen.getByLabelText(u.rowLabel('notes.txt', '2 KB', u.failed))).toBeTruthy();
    expect(screen.getByLabelText(u.rowLabel('report-final.pdf', '845 KB', u.percent(45)))).toBeTruthy();
  });

  it('long names are cut', async () => {
    await render(
      <FileList
        variant="upload"
        files={[{ id: 'x', name: 'IMG_20261110_093512.jpg', size: 1, status: 'queued' }]}
        onRemove={jest.fn()}
        emptyText="Empty"
      />,
    );
    expect(screen.getByText('IMG_20261110_093512.…')).toBeTruthy();
  });

  it('no rows: the empty text', async () => {
    await render(<FileList variant="upload" files={[]} onRemove={jest.fn()} emptyText="Your upload queue is empty" />);
    expect(screen.getByText('Your upload queue is empty')).toBeTruthy();
  });
});
