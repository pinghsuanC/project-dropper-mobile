import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, disabledTextShadow, fonts, maxFontSizeMultiplier, tones, type } from '@/theme';

import { Text } from './Text';

async function styleOf(element: React.ReactElement) {
  await render(element);
  const node = screen.getByText('hello');
  return { style: StyleSheet.flatten(node.props.style), props: node.props };
}

test('defaults to the body role and normal tone', async () => {
  const { style } = await styleOf(<Text>hello</Text>);
  expect(style.fontSize).toBe(type.body.fontSize);
  expect(style.fontFamily).toBe(type.body.fontFamily);
  expect(style.color).toBe(tones.normal);
});

test.each(Object.keys(type) as (keyof typeof type)[])('variant %s sets its size, font and spacing', async (variant) => {
  const { style } = await styleOf(<Text variant={variant}>hello</Text>);
  expect(style.fontSize).toBe(type[variant].fontSize);
  expect(style.fontFamily).toBe(type[variant].fontFamily);
  expect(style.letterSpacing).toBe(type[variant].letterSpacing);
});

test.each(Object.keys(tones) as (keyof typeof tones)[])('tone %s sets its colour', async (tone) => {
  const { style } = await styleOf(<Text tone={tone}>hello</Text>);
  expect(style.color).toBe(tones[tone]);
});

test('bold uses the bold face of the message font', async () => {
  const { style } = await styleOf(<Text bold>hello</Text>);
  expect(style.fontFamily).toBe(fonts.messageBold);
});

test('the disabled tone has the engraved white shadow', async () => {
  const { style } = await styleOf(<Text tone="disabled">hello</Text>);
  expect(style.textShadowColor).toBe(colors.disabledShadow);
  expect(style.textShadowOffset).toEqual(disabledTextShadow.textShadowOffset);
});

test('other tones have no shadow', async () => {
  const { style } = await styleOf(<Text tone="muted">hello</Text>);
  expect(style.textShadowColor).toBeUndefined();
});

test('caps how far system font scaling can grow the text', async () => {
  const { props } = await styleOf(<Text>hello</Text>);
  expect(props.maxFontSizeMultiplier).toBe(maxFontSizeMultiplier);
});

test('align sets the text alignment', async () => {
  const { style } = await styleOf(<Text align="center">hello</Text>);
  expect(style.textAlign).toBe('center');
});

test('passes through accessibility props', async () => {
  await render(<Text accessibilityRole="header">hello</Text>);
  expect(screen.getByRole('header', { name: 'hello' })).toBeTruthy();
});
