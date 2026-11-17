import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { localGif } from '@/lib/gifs';
import { sizes } from '@/theme';

import { Gif } from './Gif';

// Gif is hidden from screen readers, which Testing Library's queries skip by default.
const HIDDEN = { includeHiddenElements: true };

test('a slot with a local file shows that GIF', async () => {
  await render(<Gif slot="notWelcome" size="popup" testID="g" />);
  const image = screen.getByTestId('g-image', HIDDEN);
  expect(localGif('notWelcome')).toBeDefined();
  expect(JSON.stringify(image.props.source)).toContain('notWelcome.gif');
});

test('the banner slot shows banner.gif (Register, Server status, Upload, Shared file)', async () => {
  await render(<Gif slot="banner" size="large" testID="g" />);
  expect(JSON.stringify(screen.getByTestId('g-image', HIDDEN).props.source)).toContain('banner.gif');
});

test('a slot without a file keeps its space empty: no image, no placeholder box', async () => {
  await render(<Gif slot="homeRight" size="large" testID="g" />);
  expect(localGif('homeRight')).toBeUndefined();
  expect(screen.queryByTestId('g-image', HIDDEN)).toBeNull();
  const outer = screen.getByTestId('g', HIDDEN);
  expect(outer.children).toHaveLength(0);
  expect(StyleSheet.flatten(outer.props.style).height).toBe(sizes.gif.large.height);
});

test('no frame or background behind the GIF', async () => {
  await render(<Gif slot="homeLeft" size="half" testID="g" />);
  const outer = screen.getByTestId('g', HIDDEN);
  expect(StyleSheet.flatten(outer.props.style).backgroundColor).toBeUndefined();
  expect(screen.queryByTestId('g-bevel', HIDDEN)).toBeNull();
  // The image sits straight in the slot's box, with nothing between them.
  expect(screen.getByTestId('g-image', HIDDEN).parent).toBe(outer);
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
