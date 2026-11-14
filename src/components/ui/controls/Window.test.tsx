import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { strings } from '@/constants/strings';
import { colors } from '@/theme';

import { Window } from './Window';

test('shows the title and its children', async () => {
  await render(
    <Window title="Properties">
      <Text>body text</Text>
    </Window>,
  );
  expect(screen.getByText('Properties')).toBeTruthy();
  expect(screen.getByText('body text')).toBeTruthy();
});

test('is a raised box on the face colour', async () => {
  await render(<Window title="T" testID="w" />);
  const inner = StyleSheet.flatten(screen.getByTestId('w-inner').props.style);
  expect(inner.backgroundColor).toBe(colors.face);
  expect(inner.borderBottomColor).toBe(colors.bevelShadow);
});

test('passes its handlers to the title bar', async () => {
  const onClose = jest.fn();
  await render(<Window title="T" onClose={onClose} />);
  const close = screen.getByRole('button', { name: strings.ui.titleBar.close });
  expect(close.props.accessibilityState).toMatchObject({ disabled: false });
  await fireEvent.press(close);
  expect(onClose).toHaveBeenCalled();
  expect(
    screen.getByRole('button', { name: strings.ui.titleBar.minimize }).props.accessibilityState,
  ).toMatchObject({ disabled: true });
});
