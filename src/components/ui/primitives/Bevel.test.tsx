import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { colors } from '@/theme';

import { Bevel, type BevelKind } from './Bevel';

// A bevel is two 1px lines: the outer one (testID) and the inner one (testID-inner).
async function edgesOf(kind: BevelKind) {
  await render(
    <Bevel kind={kind} testID="b">
      <Text>child</Text>
    </Bevel>,
  );
  const outer = StyleSheet.flatten(screen.getByTestId('b').props.style);
  const inner = StyleSheet.flatten(screen.getByTestId('b-inner').props.style);
  const edges = (s: typeof outer) => ({
    tl: [s.borderTopColor, s.borderLeftColor],
    br: [s.borderBottomColor, s.borderRightColor],
  });
  return { outer: edges(outer), inner: edges(inner), fill: inner.backgroundColor, outerStyle: outer };
}

const pair = (c: string) => [c, c];

test('raised: light top-left, dark bottom-right, grey inner shadow, face inside', async () => {
  const b = await edgesOf('raised');
  expect(b.outer).toEqual({ tl: pair(colors.bevelLight), br: pair(colors.bevelDark) });
  expect(b.inner).toEqual({ tl: pair(colors.bevelLight), br: pair(colors.bevelShadow) });
  expect(b.fill).toBe(colors.face);
});

test('sunken: the reverse of raised, face inside', async () => {
  const b = await edgesOf('sunken');
  expect(b.outer).toEqual({ tl: pair(colors.bevelDark), br: pair(colors.bevelLight) });
  expect(b.inner).toEqual({ tl: pair(colors.bevelShadow), br: pair(colors.bevelLight) });
  expect(b.fill).toBe(colors.face);
});

test('field: sunken edges, white inside', async () => {
  const b = await edgesOf('field');
  expect(b.outer).toEqual({ tl: pair(colors.bevelDark), br: pair(colors.bevelLight) });
  expect(b.inner).toEqual({ tl: pair(colors.bevelShadow), br: pair(colors.bevelLight) });
  expect(b.fill).toBe(colors.field);
});

test('etched: a grey line with a white line inside it', async () => {
  const b = await edgesOf('etched');
  expect(b.outer).toEqual({ tl: pair(colors.bevelShadow), br: pair(colors.bevelLight) });
  expect(b.inner).toEqual({ tl: pair(colors.bevelLight), br: pair(colors.bevelShadow) });
});

test('each line is 1px, so the edge is 2px', async () => {
  const b = await edgesOf('raised');
  expect(b.outerStyle.borderWidth).toBe(1);
});

test('renders its children', async () => {
  await render(
    <Bevel kind="raised">
      <Text>inside</Text>
    </Bevel>,
  );
  expect(screen.getByText('inside')).toBeTruthy();
});
