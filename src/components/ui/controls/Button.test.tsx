import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text as RNText } from 'react-native';

import { colors, sizes, tones } from '@/theme';

import { Button } from './Button';

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

test('shows its label and calls onPress', async () => {
  const onPress = jest.fn();
  await render(<Button label="Retry" onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('has at least a 44×44 touch target', async () => {
  await render(<Button label="OK" onPress={() => {}} testID="b" />);
  const style = flat('b');
  expect(style.minWidth).toBeGreaterThanOrEqual(sizes.touchTarget);
  expect(style.minHeight).toBeGreaterThanOrEqual(sizes.touchTarget);
});

test('while pressed, the bevel sinks and the content moves 1px, but nothing resizes', async () => {
  await render(<Button label="OK" onPress={() => {}} testID="b" />);
  const before = { outer: flat('b'), inner: flat('b-inner'), content: flat('b-content') };
  expect(before.outer.borderTopColor).toBe(colors.bevelLight);
  expect(before.content.transform).toBeUndefined();

  await fireEvent(screen.getByRole('button', { name: 'OK' }), 'pressIn');
  const during = { outer: flat('b'), inner: flat('b-inner'), content: flat('b-content') };
  expect(during.outer.borderTopColor).toBe(colors.bevelDark);
  expect(during.content.transform).toEqual([{ translateX: 1 }, { translateY: 1 }]);

  for (const key of ['padding', 'paddingHorizontal', 'paddingVertical', 'minWidth', 'minHeight', 'borderWidth'] as const) {
    expect(during.outer[key]).toEqual(before.outer[key]);
    expect(during.inner[key]).toEqual(before.inner[key]);
  }

  await fireEvent(screen.getByRole('button', { name: 'OK' }), 'pressOut');
  expect(flat('b').borderTopColor).toBe(colors.bevelLight);
});

test('disabled: greyed label, accessibilityState, ignores presses and stays raised', async () => {
  const onPress = jest.fn();
  await render(<Button label="No" onPress={onPress} disabled testID="b" />);
  const button = screen.getByRole('button', { name: 'No' });
  expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  expect(StyleSheet.flatten(screen.getByText('No').props.style).color).toBe(tones.disabled);

  await fireEvent.press(button);
  await fireEvent(button, 'pressIn');
  expect(onPress).not.toHaveBeenCalled();
  expect(flat('b').borderTopColor).toBe(colors.bevelLight);
});

test('large: the icon sits above the label', async () => {
  await render(
    <Button label="Checking" variant="large" icon={<RNText>ICON</RNText>} onPress={() => {}} testID="b" />,
  );
  expect(flat('b-content').flexDirection).toBe('column');
  expect(screen.getByText('ICON')).toBeTruthy();
});

test('start: the icon sits left of the label', async () => {
  await render(
    <Button label="Properties" variant="start" icon={<RNText>ICON</RNText>} onPress={() => {}} testID="b" />,
  );
  expect(flat('b-content').flexDirection).toBe('row');
});

test('start: the touchable is only as wide as the button, not the whole taskbar', async () => {
  await render(<Button label="Properties" variant="start" onPress={() => {}} />);
  const touchable = screen.getByRole('button', { name: 'Properties' });
  expect(StyleSheet.flatten(touchable.props.style)?.alignSelf).toBe('flex-start');
});
