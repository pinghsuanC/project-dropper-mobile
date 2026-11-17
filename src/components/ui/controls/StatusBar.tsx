// Sunken strip of `|`-separated segments under a window's content (2010), e.g. Upload's
// "Connected ● | 3 files | 1:51 PM". A segment can carry the green "connected" dot.
// Screen readers hear the segments as one line, without the bars.
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, sizes, spacing } from '@/theme';

import { Bevel } from '../primitives/Bevel';
import { Text } from '../primitives/Text';

export type StatusSegment = { text: string; dot?: boolean };

type Props = {
  segments: StatusSegment[];
  testID?: string;
};

export function StatusBar({ segments, testID }: Props) {
  return (
    <Bevel kind="sunken" innerStyle={styles.inner}>
      <View
        testID={testID}
        accessible
        accessibilityLabel={segments.map((s) => s.text).join(', ')}
        style={styles.row}
      >
        {segments.map((segment, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <Text variant="caption" tone="muted">
                |
              </Text>
            ) : null}
            <View style={styles.segment}>
              <Text variant="caption">{segment.text}</Text>
              {segment.dot ? <View testID={testID ? `${testID}-dot-${i}` : undefined} style={styles.dot} /> : null}
            </View>
          </Fragment>
        ))}
      </View>
    </Bevel>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.md },
  segment: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: {
    width: sizes.statusDot,
    height: sizes.statusDot,
    borderRadius: sizes.statusDot / 2,
    backgroundColor: colors.success,
  },
});
