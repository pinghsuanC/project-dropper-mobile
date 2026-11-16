import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, sizes } from '@/theme';

import { Taskbar } from './Taskbar';

const HIDDEN = { includeHiddenElements: true };

test('shows the Properties start button with the gear icon', async () => {
  await render(<Taskbar onProperties={jest.fn()} testID="t" />);
  expect(screen.getByRole('button', { name: strings.taskbar.properties })).toBeTruthy();
  expect(screen.getByTestId('t-gear', HIDDEN)).toBeTruthy();
});

test('pressing Properties calls onProperties', async () => {
  const onProperties = jest.fn();
  await render(<Taskbar onProperties={onProperties} />);
  await fireEvent.press(screen.getByRole('button', { name: strings.taskbar.properties }));
  expect(onProperties).toHaveBeenCalledTimes(1);
});

test('is a face-grey strip with a light top edge, at least the taskbar height', async () => {
  await render(<Taskbar onProperties={jest.fn()} testID="t" />);
  const style = StyleSheet.flatten(screen.getByTestId('t').props.style);
  expect(style.backgroundColor).toBe(colors.face);
  expect(style.borderTopColor).toBe(colors.bevelLight);
  expect(style.minHeight).toBe(sizes.taskbarHeight);
});
