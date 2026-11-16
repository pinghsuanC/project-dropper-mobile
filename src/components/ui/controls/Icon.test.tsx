import { render, screen } from '@testing-library/react-native';

import { sizes, tones } from '@/theme';

import { Icon, type IconName } from './Icon';

const HIDDEN = { includeHiddenElements: true };
const NAMES: IconName[] = ['monitor', 'globe', 'retry', 'gear'];

test.each(NAMES)('%s draws an SVG at the default icon size', async (name) => {
  await render(<Icon name={name} testID="i" />);
  const svg = screen.getByTestId('i', HIDDEN);
  expect(svg.props.width).toBe(sizes.icon.default);
  expect(svg.props.height).toBe(sizes.icon.default);
});

test('the start size is smaller (taskbar button)', async () => {
  await render(<Icon name="gear" size="start" testID="i" />);
  expect(screen.getByTestId('i', HIDDEN).props.width).toBe(sizes.icon.start);
});

test('is decorative: hidden from screen readers', async () => {
  await render(<Icon name="globe" testID="i" />);
  expect(screen.queryByTestId('i')).toBeNull(); // not found without hidden elements
  expect(screen.getByTestId('i-wrap', HIDDEN).props.importantForAccessibility).toBe('no-hide-descendants');
});

test('draws in the tone colour: normal by default, grey when disabled', async () => {
  const { rerender } = await render(<Icon name="globe" testID="i" />);
  expect(screen.getByTestId('i', HIDDEN).props.color).toBe(tones.normal);
  await rerender(<Icon name="globe" tone="disabled" testID="i" />);
  expect(screen.getByTestId('i', HIDDEN).props.color).toBe(tones.disabled);
});

// The SVG elements each icon is made of (react-native-svg's host names), from the prototype.
test.each([
  ['monitor', ['RNSVGRect', 'RNSVGPath'], 24],
  ['globe', ['RNSVGCircle', 'RNSVGEllipse', 'RNSVGPath'], 24],
  ['retry', ['RNSVGPath', 'RNSVGPath'], 24],
  ['gear', ['RNSVGRect', 'RNSVGCircle'], 16],
] as const)('%s is drawn from its own shapes', async (name, parts, box) => {
  await render(<Icon name={name} testID="i" />);
  const json = JSON.stringify(screen.toJSON());
  for (const part of parts) expect(json).toContain(`"type":"${part}"`);
  expect(screen.getByTestId('i', HIDDEN).props.vbWidth).toBe(box);
  if (name !== 'globe') expect(json).not.toContain('RNSVGEllipse');
});
