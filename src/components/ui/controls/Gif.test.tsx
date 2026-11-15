import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/constants/strings';
import { localGif } from '@/lib/gifs';
import { colors, sizes } from '@/theme';

import { Gif } from './Gif';

// Gif is hidden from screen readers, which Testing Library's queries skip by default.
const HIDDEN = { includeHiddenElements: true };

test('a slot with a local file shows that GIF', async () => {
  await render(<Gif slot="notWelcome" size="popup" testID="g" />);
  const image = screen.getByTestId('g-image', HIDDEN);
  expect(localGif('notWelcome')).toBeDefined();
  expect(JSON.stringify(image.props.source)).toContain('notWelcome.gif');
  expect(screen.queryByText(strings.ui.gifPlaceholder, HIDDEN)).toBeNull();
});

test('a slot without a file shows the black GIF placeholder', async () => {
  await render(<Gif slot="banner" size="large" testID="g" />);
  expect(localGif('banner')).toBeUndefined();
  expect(screen.queryByTestId('g-image', HIDDEN)).toBeNull();
  expect(screen.getByText(strings.ui.gifPlaceholder, HIDDEN)).toBeTruthy();
  const inner = StyleSheet.flatten(screen.getByTestId('g-bevel-inner', HIDDEN).props.style);
  expect(inner.backgroundColor).toBe(colors.terminal);
});

test.each(['small', 'large', 'popup'] as const)('size %s sets its dimensions', async (size) => {
  await render(<Gif slot="welcome" size={size} testID="g" />);
  const outer = StyleSheet.flatten(screen.getByTestId('g', HIDDEN).props.style);
  expect(outer.height).toBe(sizes.gif[size].height);
  if ('width' in sizes.gif[size]) expect(outer.width).toBe((sizes.gif[size] as { width: number }).width);
});

test('size half takes half the row', async () => {
  await render(<Gif slot="homeLeft" size="half" testID="g" />);
  const outer = StyleSheet.flatten(screen.getByTestId('g', HIDDEN).props.style);
  expect(outer.flex).toBe(1);
  expect(outer.height).toBe(sizes.gif.half.height);
});

test('is hidden from screen readers (decorative)', async () => {
  await render(<Gif slot="welcome" size="popup" testID="g" />);
  expect(screen.getByTestId('g', HIDDEN).props.accessibilityElementsHidden).toBe(true);
});
