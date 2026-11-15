import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/constants/strings';
import { devColors, sizes, spacing } from '@/theme';

import { DevButton } from './DevButton';

// System bars (e.g. Android's gesture bar) cover the screen edges by these insets.
let mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => mockInsets }));

beforeEach(() => {
  mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
});

const devButton = () => screen.getByRole('button', { name: strings.dev.buttonLabel });

test('shows "DEV" as a button labelled for screen readers', async () => {
  await render(<DevButton onPress={jest.fn()} />);
  expect(devButton()).toBeTruthy();
  expect(screen.getByText(strings.dev.button)).toBeTruthy();
});

test('is yellow', async () => {
  await render(<DevButton onPress={jest.fn()} />);
  const face = screen.getByTestId('dev-button-inner');
  expect(StyleSheet.flatten(face.props.style).backgroundColor).toBe(devColors.devButton);
});

test('its touch area is at least the minimum touch target', async () => {
  await render(<DevButton onPress={jest.fn()} />);
  const style = StyleSheet.flatten(devButton().props.style);
  expect(style.minWidth).toBeGreaterThanOrEqual(sizes.touchTarget);
  expect(style.minHeight).toBeGreaterThanOrEqual(sizes.touchTarget);
});

test('sits at the bottom-right, above everything else', async () => {
  await render(<DevButton onPress={jest.fn()} />);
  const style = StyleSheet.flatten(devButton().props.style);
  expect(style.position).toBe('absolute');
  expect(style.right).toBeDefined();
  expect(style.bottom).toBeDefined();
  expect(style.zIndex).toBeGreaterThan(0);
  expect(style.elevation).toBeGreaterThan(0); // Android draws by elevation, not zIndex
});

test('stays clear of the system bars: its offset adds the bottom and right insets', async () => {
  mockInsets = { top: 24, right: 30, bottom: 48, left: 0 };
  await render(<DevButton onPress={jest.fn()} />);
  const style = StyleSheet.flatten(devButton().props.style);
  expect(style.bottom).toBe(spacing.md + 48);
  expect(style.right).toBe(spacing.md + 30);
});

test('calls onPress when tapped', async () => {
  const onPress = jest.fn();
  await render(<DevButton onPress={onPress} />);
  await fireEvent.press(devButton());
  expect(onPress).toHaveBeenCalledTimes(1);
});
