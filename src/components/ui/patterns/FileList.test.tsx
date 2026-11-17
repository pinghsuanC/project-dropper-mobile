// FileList (2010), the server variant: a ListBox of files, each with its name (cut to
// FILE_NAME_MAX) and a "size · type · Uploaded when" line, plus the file's status when it has one.
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/constants/strings';
import { tones } from '@/theme';

import { FileList, type FileRow } from './FileList';

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
