// The testing menu (2010, 1020): a DEV ONLY banner, one window per app section with a
// button per screen or state, two per row. It only navigates: no server calls, no session
// or storage changes, nothing secret shown.
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Text, Window } from '@/components/ui';
import { strings } from '@/constants/strings';
import { devColors, sizes, spacing } from '@/theme';

import { DEV_ROUTES, type DevEntry, type DevSection } from './devRoutes';

/** Splits entries into rows of two; an odd last one is alone on its row. */
function pairs(entries: DevEntry[]): DevEntry[][] {
  const rows: DevEntry[][] = [];
  for (let i = 0; i < entries.length; i += 2) rows.push(entries.slice(i, i + 2));
  return rows;
}

export function DevMenu() {
  return (
    <ScrollView testID="dev-menu" contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <Text variant="title" tone="inverse" align="center" accessibilityRole="header">
          {strings.dev.banner}
        </Text>
      </View>
      {DEV_ROUTES.map((section) => (
        <Section key={section.title} section={section} />
      ))}
      <Text variant="caption" tone="inverse" align="center">
        {strings.dev.footer}
      </Text>
    </ScrollView>
  );
}

function Section({ section }: { section: DevSection }) {
  return (
    <Window title={section.title} testID={`dev-section-${section.title}`} bodyStyle={styles.body}>
      {pairs(section.entries).map((row, i) => (
        <View key={i} testID={`dev-row-${section.title}-${i}`} style={styles.row}>
          {row.map((entry) => (
            <View key={entry.label} style={styles.cell}>
              <Button label={entry.label} onPress={() => router.push(entry.href)} style={styles.button} />
            </View>
          ))}
        </View>
      ))}
    </Window>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  banner: { backgroundColor: devColors.devBanner, paddingVertical: spacing.md },
  body: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  cell: { flex: 1 },
  button: { minHeight: sizes.devMenuButtonHeight },
});
