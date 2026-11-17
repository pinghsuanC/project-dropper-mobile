// FileList (2010), the server variant: a ListBox of files, each with its name (cut to
// FILE_NAME_MAX) and a "size · when" line, or "Incomplete" for an upload never confirmed.
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
  { id: 'f-3', name: 'notes.txt', size: 2150, createdAt: at(new Date(2026, 10, 12, 8, 0)), incomplete: true },
];

async function show(files = FILES) {
  await render(<FileList files={files} emptyText="No files" now={NOW} testID="files" />);
}

it('each row: the name and a "size · when" line', async () => {
  await show();
  expect(screen.getByText('holiday-photo.jpg')).toBeTruthy();
  expect(screen.getByText(strings.format.sizeAndWhen('2.3 MB', 'Today 4:12 PM'))).toBeTruthy();
});

it('cuts long names but keeps the full name for screen readers', async () => {
  await show();
  expect(screen.getByText('IMG_20261110_093512.…')).toBeTruthy();
  const detail = strings.format.sizeAndWhen('3.2 MB', 'Nov 10');
  expect(screen.getByLabelText(strings.format.rowLabel('IMG_20261110_093512.jpg', detail))).toBeTruthy();
});

it('an incomplete upload shows "Incomplete" in the error tone instead of the date', async () => {
  await show();
  const line = screen.getByText(strings.format.sizeAndWhen('2.1 KB', strings.format.incomplete));
  expect(StyleSheet.flatten(line.props.style).color).toBe(tones.error);
  expect(screen.queryByText(/Yesterday/)).toBeNull();
});

it('shows emptyText when there are no files', async () => {
  await show([]);
  expect(screen.getByText('No files')).toBeTruthy();
});
