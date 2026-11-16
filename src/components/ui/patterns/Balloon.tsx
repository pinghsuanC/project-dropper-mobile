// Pale-yellow speech bubble with pixel-stepped corners and a tail pointing down (2010), as the
// prototype's clip-path balloon. The shape is one SVG drawn behind the text and sized from the
// text's own layout, so the balloon grows with the text (font scaling, long quotes).
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { colors, sizes, spacing } from '@/theme';

import { Text } from '../primitives/Text';

const b = sizes.balloon;

/**
 * The stepped outline of a `width` × `height` box, moved in by `inset` on every side: each
 * corner steps in by `b.step` px, `b.steps` times. Points as "x,y", clockwise from the top-left.
 */
export function steppedOutline(width: number, height: number, inset: number): string {
  const x0 = inset;
  const y0 = inset;
  const x1 = width - inset;
  const y1 = height - inset;
  const d = b.step;
  const depth = d * b.steps;
  /** A staircase from `start`: one step along `first`, one along `second`, `b.steps` times. */
  const stairs = (start: [number, number], first: [number, number], second: [number, number]) => {
    const pts: [number, number][] = [start];
    let [x, y] = start;
    for (let i = 0; i < b.steps; i++) {
      x += first[0] * d;
      y += first[1] * d;
      pts.push([x, y]);
      x += second[0] * d;
      y += second[1] * d;
      pts.push([x, y]);
    }
    return pts;
  };
  const points = [
    ...stairs([x0, y0 + depth], [1, 0], [0, -1]), // top-left: left edge → top edge
    ...stairs([x1 - depth, y0], [0, 1], [1, 0]), // top-right: top edge → right edge
    ...stairs([x1, y1 - depth], [-1, 0], [0, 1]), // bottom-right: right edge → bottom edge
    ...stairs([x0 + depth, y1], [0, -1], [-1, 0]), // bottom-left: bottom edge → left edge
  ];
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

/** A right triangle with its right angle at (x, y), legs `side` long, pointing down-right. */
const tail = (x: number, y: number, side: number) => `${x},${y} ${x + side},${y} ${x},${y + side}`;

type Props = {
  /** Bold first line (e.g. the greeting). */
  title: string;
  /** Small caps line above the text (e.g. "QUOTE OF THE DAY"). */
  label?: string;
  /** Italic text. */
  text: string;
  testID?: string;
};

export function Balloon({ title, label, text, testID }: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((old) => (old?.width === width && old?.height === height ? old : { width, height }));
  };
  const tailTop = size ? size.height - b.outline : 0;

  return (
    <View testID={testID} accessible accessibilityRole="text" style={styles.wrap}>
      {size ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Svg testID={testID ? `${testID}-shape` : undefined} width={size.width} height={size.height + b.tail - b.outline}>
            {/* Body: black outline, yellow inside; then the tail, black with a yellow inner
                triangle that also opens the body's bottom outline where they meet. */}
            <Polygon points={steppedOutline(size.width, size.height, 0)} fill={colors.bevelDark} />
            <Polygon points={steppedOutline(size.width, size.height, b.outline)} fill={colors.tooltip} />
            <Polygon points={tail(b.tailLeft, tailTop, b.tail)} fill={colors.bevelDark} />
            <Polygon
              points={tail(b.tailLeft + b.outline, tailTop - b.outline, b.tail - b.tailInset)}
              fill={colors.tooltip}
            />
          </Svg>
        </View>
      ) : null}
      <View testID={testID ? `${testID}-body` : undefined} style={styles.body} onLayout={onLayout}>
        <Text bold>{title}</Text>
        {label ? (
          <Text variant="caption" tone="muted" bold>
            {label}
          </Text>
        ) : null}
        <Text variant="label" italic>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: b.tail - b.outline },
  body: {
    paddingVertical: spacing.md + b.outline,
    paddingHorizontal: spacing.lg + b.outline,
    gap: spacing.xs,
  },
});
