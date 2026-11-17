// A sunken white scrolling list (2010): one row per item, or `emptyText` when there are none.
// Fixed height: longer lists scroll inside it, inside a screen that may scroll too.
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { sizes, spacing } from '@/theme';

import { Bevel } from '../primitives/Bevel';
import { Text } from '../primitives/Text';

type Props<T> = {
  items: T[];
  /** A stable key per item. */
  keyOf: (item: T) => string;
  renderRow: (item: T) => ReactElement;
  /** Shown instead of rows when there are no items (also "Loading…" or an error line). */
  emptyText: string;
  testID?: string;
};

export function ListBox<T>({ items, keyOf, renderRow, emptyText, testID }: Props<T>) {
  return (
    <Bevel kind="field" style={styles.box} testID={testID ? `${testID}-field` : undefined}>
      <ScrollView
        testID={testID}
        accessibilityRole="list"
        nestedScrollEnabled
        contentContainerStyle={styles.content}
      >
        {items.length === 0 ? (
          <Text>{emptyText}</Text>
        ) : (
          items.map((item) => <View key={keyOf(item)}>{renderRow(item)}</View>)
        )}
      </ScrollView>
    </Bevel>
  );
}

const styles = StyleSheet.create({
  box: { height: sizes.listBoxHeight },
  content: { padding: spacing.md, gap: spacing.md },
});
