import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, tones } from '@/theme';

import { TextField } from './TextField';

type HarnessProps = {
  initial?: string;
  /** Pass `undefined` to render the field without a hint. */
  hint?: string;
  maxLength?: number;
  filter?: (text: string) => string;
  editable?: boolean;
  icon?: ReactNode;
  labelHidden?: boolean;
  onChange?: (text: string) => void;
};

/** TextField is controlled: keep its value in state, as a screen would. */
function Harness({ initial = '', onChange, ...rest }: HarnessProps) {
  const [value, setValue] = useState(initial);
  return (
    <TextField
      label="Your name"
      placeholder="e.g. Alex"
      hint="What the app calls you."
      value={value}
      onChangeText={(text) => {
        setValue(text);
        onChange?.(text);
      }}
      testID="field"
      {...rest}
    />
  );
}

const input = () => screen.getByLabelText('Your name');
const dropBang = (text: string) => text.replace(/!/g, '');

test('shows the label, placeholder, hint and an empty counter', async () => {
  await render(<Harness maxLength={20} />);
  expect(screen.getByText('Your name')).toBeTruthy();
  expect(input().props.placeholder).toBe('e.g. Alex');
  expect(screen.getByText('What the app calls you.')).toBeTruthy();
  expect(screen.getByText(strings.ui.textField.count(0, 20))).toBeTruthy();
});

test('the field is a white sunken box', async () => {
  await render(<Harness />);
  const inner = StyleSheet.flatten(screen.getByTestId('field-box-inner').props.style);
  expect(inner.backgroundColor).toBe(colors.field);
  expect(StyleSheet.flatten(screen.getByTestId('field-box').props.style).borderTopColor).toBe(colors.bevelDark);
});

test('typing updates the value and the counter', async () => {
  await render(<Harness maxLength={20} />);
  await fireEvent.changeText(input(), 'Alex');
  expect(input().props.value).toBe('Alex');
  expect(screen.getByText(strings.ui.textField.count(4, 20))).toBeTruthy();
});

test('the counter reads as words for screen readers', async () => {
  await render(<Harness initial="Alex" maxLength={20} />);
  expect(screen.getByText(strings.ui.textField.count(4, 20)).props.accessibilityLabel).toBe(
    strings.ui.textField.countLabel(4, 20),
  );
});

test('the filter runs on every change', async () => {
  const onChange = jest.fn();
  await render(<Harness filter={dropBang} onChange={onChange} />);
  await fireEvent.changeText(input(), 'ab!c');
  expect(onChange).toHaveBeenLastCalledWith('abc');
  expect(input().props.value).toBe('abc');
});

test('a paste is filtered first, then cut to the limit', async () => {
  const onChange = jest.fn();
  await render(<Harness maxLength={20} filter={dropBang} onChange={onChange} />);
  // 25 characters, 6 of them filtered: 19 survive. Cutting first would keep only 14.
  await fireEvent.changeText(input(), 'a!'.repeat(6) + 'b'.repeat(13));
  expect(onChange).toHaveBeenLastCalledWith('aaaaaa' + 'b'.repeat(13));
  expect(screen.getByText(strings.ui.textField.count(19, 20))).toBeTruthy();
});

test('never holds more than maxLength characters', async () => {
  const onChange = jest.fn();
  await render(<Harness maxLength={20} onChange={onChange} />);
  await fireEvent.changeText(input(), 'x'.repeat(30));
  expect(onChange).toHaveBeenLastCalledWith('x'.repeat(20));
  expect(screen.getByText(strings.ui.textField.count(20, 20))).toBeTruthy();
});

test('leaves the limit to its own code, not the native maxLength (which would cut a paste before the filter)', async () => {
  await render(<Harness maxLength={20} filter={dropBang} />);
  expect(input().props.maxLength).toBeUndefined();
});

test('counts characters, not UTF-16 units', async () => {
  await render(<Harness maxLength={20} />);
  // 𠮷 is one character but two UTF-16 units.
  await fireEvent.changeText(input(), '𠮷野');
  expect(screen.getByText(strings.ui.textField.count(2, 20))).toBeTruthy();
});

test('no hint: the counter shows on its own and screen readers get no hint', async () => {
  await render(<Harness hint={undefined} maxLength={20} />);
  expect(screen.queryByText('What the app calls you.')).toBeNull();
  expect(screen.getByText(strings.ui.textField.count(0, 20))).toBeTruthy();
  expect(input().props.accessibilityHint).toBeUndefined();
});

test('no hint and no maxLength: no footer at all', async () => {
  await render(<Harness hint={undefined} />);
  expect(screen.queryByTestId('field-footer')).toBeNull();
});

test('a hint alone still gets its footer', async () => {
  await render(<Harness />);
  expect(screen.getByTestId('field-footer')).toBeTruthy();
});

test('has no counter without maxLength', async () => {
  await render(<Harness />);
  expect(screen.queryByText(/\/\d+$/)).toBeNull();
});

test('not editable: greyed text and input is ignored', async () => {
  const onChange = jest.fn();
  await render(<Harness initial="Alex" editable={false} onChange={onChange} />);
  expect(input().props.editable).toBe(false);
  expect(StyleSheet.flatten(input().props.style).color).toBe(tones.disabled);
  await fireEvent.changeText(input(), 'Bob');
  expect(onChange).not.toHaveBeenCalled();
  expect(input().props.value).toBe('Alex');
});

test('editable text uses the normal tone', async () => {
  await render(<Harness initial="Alex" />);
  expect(StyleSheet.flatten(input().props.style).color).toBe(tones.normal);
});

test('screen readers get the label and the hint', async () => {
  await render(<Harness />);
  expect(input().props.accessibilityLabel).toBe('Your name');
  expect(input().props.accessibilityHint).toBe('What the app calls you.');
});

test('an icon shows inside the field, before the text', async () => {
  await render(<Harness icon={<Text testID="field-icon">Q</Text>} />);
  expect(screen.getByTestId('field-icon')).toBeTruthy();
});

test('labelHidden: no visible label, but screen readers still get it', async () => {
  await render(<Harness labelHidden />);
  expect(screen.queryByText('Your name')).toBeNull();
  expect(input().props.accessibilityLabel).toBe('Your name');
});
