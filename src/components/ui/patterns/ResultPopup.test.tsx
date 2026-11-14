import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/constants/strings';
import { sizes, spacing } from '@/theme';

import { ResultPopup } from './ResultPopup';

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

test('shows its title, GIF and message', async () => {
  await render(<ResultPopup title="Not registered" slot="notWelcome" message="Go register" testID="p" />);
  expect(screen.getByText('Not registered')).toBeTruthy();
  expect(screen.getByText('Go register')).toBeTruthy();
  expect(screen.getByTestId('p-gif', { includeHiddenElements: true })).toBeTruthy();
});

test('its title-bar buttons are all disabled', async () => {
  await render(<ResultPopup title="T" slot="welcome" message="m" />);
  const { minimize, maximize, close } = strings.ui.titleBar;
  for (const name of [minimize, maximize, close]) {
    expect(screen.getByRole('button', { name }).props.accessibilityState).toMatchObject({ disabled: true });
  }
});

test('has no button unless one is given', async () => {
  await render(<ResultPopup title="T" slot="welcome" message="m" />);
  expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
});

test('shows the given button and calls it on press', async () => {
  const onPress = jest.fn();
  await render(<ResultPopup title="T" slot="offline" message="m" button={{ label: 'Retry', onPress }} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('offset hangs it off the right edge and keeps the content centred in the visible part', async () => {
  await render(<ResultPopup title="T" slot="welcome" message="m" offset={40} testID="p" />);
  const frame = flat('p');
  expect(frame.width).toBe(sizes.popupWidth);
  expect(frame.right).toBe(-40);
  expect(flat('p-body').paddingRight).toBe(spacing.lg + 40);
  expect(flat('p-body').alignItems).toBe('center');
});

test('without an offset it sits flush with the right edge', async () => {
  await render(<ResultPopup title="T" slot="welcome" message="m" testID="p" />);
  expect(flat('p').right).toBe(0);
  expect(flat('p-body').paddingRight).toBe(spacing.lg);
});
