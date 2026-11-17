import { render, screen } from '@testing-library/react-native';

import { StatusBar } from './StatusBar';

test('shows each segment, separated by bars', async () => {
  await render(<StatusBar segments={[{ text: 'Connected' }, { text: '3 files' }, { text: '1:51 PM' }]} testID="s" />);
  expect(screen.getByText('Connected')).toBeTruthy();
  expect(screen.getByText('3 files')).toBeTruthy();
  expect(screen.getByText('1:51 PM')).toBeTruthy();
  expect(screen.getAllByText('|', { includeHiddenElements: true })).toHaveLength(2);
});

test('a segment can carry the green dot', async () => {
  await render(<StatusBar segments={[{ text: 'Connected', dot: true }, { text: '0 files' }]} testID="s" />);
  expect(screen.getAllByTestId(/^s-dot-/, { includeHiddenElements: true })).toHaveLength(1);
});

test('reads as one line for screen readers, without the bars', async () => {
  await render(<StatusBar segments={[{ text: 'Connected' }, { text: '3 files' }]} testID="s" />);
  expect(screen.getByLabelText('Connected, 3 files')).toBeTruthy();
});
