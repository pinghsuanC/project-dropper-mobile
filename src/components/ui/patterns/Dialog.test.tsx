import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { strings } from '@/constants/strings';
import { layers } from '@/theme';

import { Dialog } from './Dialog';

const ok = (onPress = jest.fn()) => ({ label: 'OK', onPress });
const { minimize, maximize, close } = strings.ui.titleBar;

test('shows the default "Error" heading and the message', async () => {
  await render(<Dialog kind="error" message="The server couldn't register this phone." primary={ok()} />);
  // Once in the title bar and once as the bold heading.
  expect(screen.getAllByText(strings.ui.dialog.error)).toHaveLength(2);
  expect(screen.getByText("The server couldn't register this phone.")).toBeTruthy();
});

test('a given heading replaces the default', async () => {
  await render(<Dialog kind="error" heading="Process Aborted" message="m" primary={ok()} />);
  expect(screen.getAllByText('Process Aborted')).toHaveLength(2);
  expect(screen.queryByText(strings.ui.dialog.error)).toBeNull();
});

test('shows the error icon', async () => {
  await render(<Dialog kind="error" message="m" primary={ok()} testID="d" />);
  expect(screen.getByTestId('d-icon', { includeHiddenElements: true })).toBeTruthy();
});

test('code and details both show in the box', async () => {
  await render(<Dialog kind="error" message="m" code={409} details="Key already registered" primary={ok()} testID="d" />);
  expect(screen.getByTestId('d-box')).toBeTruthy();
  expect(screen.getByText(strings.ui.dialog.code)).toBeTruthy();
  expect(screen.getByText('409')).toBeTruthy();
  expect(screen.getByText(strings.ui.dialog.details)).toBeTruthy();
  expect(screen.getByText('Key already registered')).toBeTruthy();
});

test('code only: only the Code row', async () => {
  await render(<Dialog kind="error" message="m" code={500} primary={ok()} testID="d" />);
  expect(screen.getByText(strings.ui.dialog.code)).toBeTruthy();
  expect(screen.queryByText(strings.ui.dialog.details)).toBeNull();
});

test('details only: only the Details row', async () => {
  await render(<Dialog kind="error" message="m" details="Bad key" primary={ok()} testID="d" />);
  expect(screen.getByText(strings.ui.dialog.details)).toBeTruthy();
  expect(screen.queryByText(strings.ui.dialog.code)).toBeNull();
});

test('neither code nor details: no box', async () => {
  await render(<Dialog kind="error" message="m" primary={ok()} testID="d" />);
  expect(screen.queryByTestId('d-box')).toBeNull();
  expect(screen.queryByText(strings.ui.dialog.code)).toBeNull();
});

test('pressing the primary button calls its handler', async () => {
  const onPress = jest.fn();
  await render(<Dialog kind="error" message="m" primary={ok(onPress)} />);
  await fireEvent.press(screen.getByRole('button', { name: 'OK' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('no secondary button unless given', async () => {
  await render(<Dialog kind="error" message="m" primary={ok()} />);
  expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
});

test('shows the secondary button and calls it', async () => {
  const onCancel = jest.fn();
  await render(<Dialog kind="error" message="m" primary={ok()} secondary={{ label: 'Cancel', onPress: onCancel }} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test('✕ does what the only button does', async () => {
  const onPress = jest.fn();
  await render(<Dialog kind="error" message="m" primary={ok(onPress)} />);
  await fireEvent.press(screen.getByRole('button', { name: close }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('with two buttons, ✕ does what the secondary does', async () => {
  const onOk = jest.fn();
  const onCancel = jest.fn();
  await render(
    <Dialog kind="error" message="m" primary={ok(onOk)} secondary={{ label: 'Cancel', onPress: onCancel }} />,
  );
  await fireEvent.press(screen.getByRole('button', { name: close }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onOk).not.toHaveBeenCalled();
});

test('minimize and maximize are disabled, close is enabled', async () => {
  await render(<Dialog kind="error" message="m" primary={ok()} />);
  expect(screen.getByRole('button', { name: minimize }).props.accessibilityState).toMatchObject({ disabled: true });
  expect(screen.getByRole('button', { name: maximize }).props.accessibilityState).toMatchObject({ disabled: true });
  expect(screen.getByRole('button', { name: close }).props.accessibilityState).toMatchObject({ disabled: false });
});

test('is announced as an alert', async () => {
  await render(<Dialog kind="error" message="m" primary={ok()} testID="d" />);
  expect(screen.getByTestId('d').props.accessibilityRole).toBe('alert');
});

test('is modal for screen readers (iOS; Android screens hide their own content)', async () => {
  await render(<Dialog kind="error" message="m" primary={ok()} testID="d" />);
  expect(screen.getByTestId('d').props.accessibilityViewIsModal).toBe(true);
});

test('moves screen-reader focus to the primary button', async () => {
  // jest-expo already mocks AccessibilityInfo: clear the calls earlier renders left on it.
  const send = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
  send.mockClear();
  await render(<Dialog kind="error" message="m" primary={ok()} />);
  expect(send).toHaveBeenCalledTimes(1);
  const [target, event] = send.mock.calls[0];
  expect(event).toBe('focus');
  // The target is the primary button's view (it carries the button's label).
  expect((target as unknown as { props: { accessibilityLabel?: string } }).props?.accessibilityLabel).toBe('OK');
  send.mockRestore();
});

test('covers the whole screen above it, on the dialog layer (below the DEV button)', async () => {
  await render(<Dialog kind="error" message="m" primary={ok()} testID="d" />);
  const overlay = StyleSheet.flatten(screen.getByTestId('d-overlay').props.style);
  expect(overlay).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
  expect(overlay.zIndex).toBe(layers.dialog);
  expect(overlay.elevation).toBe(layers.dialog);
});

describe('info', () => {
  test('shows the info icon, not the error icon', async () => {
    await render(<Dialog kind="info" heading="Camera access" message="m" primary={ok()} testID="d" />);
    expect(screen.getByTestId('d-icon-info', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('d-icon', { includeHiddenElements: true })).toBeNull();
  });

  test('a title replaces the heading in the title bar only', async () => {
    await render(<Dialog kind="info" title="Camera" heading="Camera access" message="m" primary={ok()} />);
    expect(screen.getByText('Camera')).toBeTruthy();
    expect(screen.getAllByText('Camera access')).toHaveLength(1);
  });
});
