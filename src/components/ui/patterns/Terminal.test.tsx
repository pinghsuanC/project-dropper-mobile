import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, motion, tones, type } from '@/theme';

import { Terminal } from './Terminal';

const opacity = () => StyleSheet.flatten(screen.getByTestId('t-cursor', { includeHiddenElements: true }).props.style).opacity;

afterEach(() => {
  jest.useRealTimers();
});

test('is a DROPPER.EXE window with greyed title-bar buttons', async () => {
  await render(<Terminal lines={[]} testID="t" />);
  expect(screen.getByText(strings.ui.terminalTitle)).toBeTruthy();
  for (const name of Object.values({ a: strings.ui.titleBar.minimize, b: strings.ui.titleBar.close })) {
    expect(screen.getByRole('button', { name }).props.accessibilityState).toMatchObject({ disabled: true });
  }
});

test('shows each line in the terminal font on black', async () => {
  await render(<Terminal lines={['Trying to connect ...', 'second line']} testID="t" />);
  const line = StyleSheet.flatten(screen.getByText('Trying to connect ...').props.style);
  expect(line.fontFamily).toBe(type.terminal.fontFamily);
  expect(line.color).toBe(tones.terminal);
  expect(screen.getByText('second line')).toBeTruthy();
  const screenArea = StyleSheet.flatten(screen.getByTestId('t-screen-inner').props.style);
  expect(screenArea.backgroundColor).toBe(colors.terminal);
});

test('the cursor blinks', async () => {
  jest.useFakeTimers();
  await render(<Terminal lines={['x']} testID="t" />);
  expect(opacity()).toBe(1);
  await act(async () => {
    jest.advanceTimersByTime(motion.cursorBlinkMs);
  });
  expect(opacity()).toBe(0);
  await act(async () => {
    jest.advanceTimersByTime(motion.cursorBlinkMs);
  });
  expect(opacity()).toBe(1);
});
