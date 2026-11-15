// The 2px Windows 98 edge, drawn as two 1px lines (outer and inner). Everything with an
// edge uses it (2010).
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { borders, colors } from '@/theme';

export type BevelKind = 'raised' | 'sunken' | 'field' | 'etched';

type Line = { topLeft: string; bottomRight: string };
type Edges = { outer: Line; inner: Line; fill?: string };

const EDGES: Record<BevelKind, Edges> = {
  raised: {
    outer: { topLeft: colors.bevelLight, bottomRight: colors.bevelDark },
    inner: { topLeft: colors.bevelLight, bottomRight: colors.bevelShadow },
    fill: colors.face,
  },
  sunken: {
    outer: { topLeft: colors.bevelDark, bottomRight: colors.bevelLight },
    inner: { topLeft: colors.bevelShadow, bottomRight: colors.bevelLight },
    fill: colors.face,
  },
  field: {
    outer: { topLeft: colors.bevelDark, bottomRight: colors.bevelLight },
    inner: { topLeft: colors.bevelShadow, bottomRight: colors.bevelLight },
    fill: colors.field,
  },
  etched: {
    outer: { topLeft: colors.bevelShadow, bottomRight: colors.bevelLight },
    inner: { topLeft: colors.bevelLight, bottomRight: colors.bevelShadow },
  },
};

const lineStyle = ({ topLeft, bottomRight }: Line): ViewStyle => ({
  borderWidth: borders.line,
  borderTopColor: topLeft,
  borderLeftColor: topLeft,
  borderBottomColor: bottomRight,
  borderRightColor: bottomRight,
});

type Props = {
  kind: BevelKind;
  children?: ReactNode;
  /** Outer box: size and position. */
  style?: StyleProp<ViewStyle>;
  /** Inside the edge: padding and layout of the children. */
  innerStyle?: StyleProp<ViewStyle>;
  /** Overrides the kind's fill colour (e.g. black for a terminal or GIF). */
  fill?: string;
  testID?: string;
};

export function Bevel({ kind, children, style, innerStyle, fill, testID }: Props) {
  const edges = EDGES[kind];
  return (
    <View testID={testID} style={[lineStyle(edges.outer), style]}>
      <View
        testID={testID ? `${testID}-inner` : undefined}
        style={[
          styles.inner,
          lineStyle(edges.inner),
          { backgroundColor: fill ?? edges.fill },
          innerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { flexGrow: 1 },
});
