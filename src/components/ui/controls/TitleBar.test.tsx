import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, spacing } from '@/theme';

import { TitleBar } from './TitleBar';

const { minimize, maximize, close } = strings.ui.titleBar;
const button = (name: string) => screen.getByRole('button', { name });

test('shows the title', async () => {
  await render(<TitleBar title="DROPPER.EXE" />);
  expect(screen.getByText('DROPPER.EXE')).toBeTruthy();
});

test('with no handlers, all three buttons are disabled', async () => {
  await render(<TitleBar title="T" />);
  for (const name of [minimize, maximize, close]) {
    expect(button(name).props.accessibilityState).toMatchObject({ disabled: true });
  }
});

test.each([
  ['onMinimize', minimize],
  ['onMaximize', maximize],
  ['onClose', close],
] as const)('%s enables only its own button and is called on press', async (prop, name) => {
  const handler = jest.fn();
  await render(<TitleBar title="T" {...{ [prop]: handler }} />);

  expect(button(name).props.accessibilityState).toMatchObject({ disabled: false });
  for (const other of [minimize, maximize, close].filter((n) => n !== name)) {
    expect(button(other).props.accessibilityState).toMatchObject({ disabled: true });
  }

  await fireEvent.press(button(name));
  expect(handler).toHaveBeenCalledTimes(1);
});

test('an enabled button sinks while held and comes back up when released', async () => {
  await render(<TitleBar title="T" onClose={() => {}} />);
  const edge = () => StyleSheet.flatten(screen.getByTestId('title-close').props.style).borderTopColor;
  expect(edge()).toBe(colors.bevelLight);
  await fireEvent(button(close), 'pressIn');
  expect(edge()).toBe(colors.bevelDark);
  await fireEvent(button(close), 'pressOut');
  expect(edge()).toBe(colors.bevelLight);
});

// The pictograms are drawn shapes, not font characters: the message font has no □ or ✕.
const ink = (id: string) => {
  const s = StyleSheet.flatten(screen.getByTestId(id).props.style);
  return s.backgroundColor ?? s.borderColor;
};

test.each(['minimize', 'maximize', 'close'])('the %s glyph is drawn, not typed', async (kind) => {
  await render(<TitleBar title="T" onMinimize={() => {}} onMaximize={() => {}} onClose={() => {}} />);
  expect(screen.getByTestId(`title-${kind}-glyph`)).toBeTruthy();
  for (const char of ['_', '□', '✕']) expect(screen.queryByText(char)).toBeNull();
});

test('an enabled glyph is drawn in the text colour, with no shadow', async () => {
  await render(<TitleBar title="T" onClose={() => {}} />);
  expect(ink('title-close-glyph-ink')).toBe(colors.text);
  expect(screen.queryByTestId('title-close-glyph-shadow')).toBeNull();
});

test('a disabled glyph is grey with the engraved white shadow', async () => {
  await render(<TitleBar title="T" />);
  for (const kind of ['minimize', 'maximize', 'close']) {
    expect(ink(`title-${kind}-glyph-ink`)).toBe(colors.disabled);
    expect(ink(`title-${kind}-glyph-shadow`)).toBe(colors.disabledShadow);
  }
});

test('the three buttons are evenly spaced, with no extra spacer', async () => {
  await render(<TitleBar title="T" />);
  const row = screen.getByTestId('title-buttons');
  expect(StyleSheet.flatten(row.props.style).gap).toBe(spacing.xs);
  expect(row.children).toHaveLength(3);
});

test('a disabled button ignores presses', async () => {
  const onClose = jest.fn();
  await render(<TitleBar title="T" onClose={onClose} />);
  await fireEvent.press(button(minimize));
  await fireEvent.press(button(maximize));
  expect(onClose).not.toHaveBeenCalled();
});
