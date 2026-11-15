// Floating yellow DEV button (2010 Testing menu): bottom-right, above screens and popups.
// Its pressable area is the full touch target; the yellow face inside sits in its corner.
// Absolute positioning ignores the root SafeAreaView's padding, so the offset adds the
// safe-area insets itself to stay clear of the system bars.
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bevel, Text } from '@/components/ui';
import { strings } from '@/constants/strings';
import { devColors, sizes, spacing } from '@/theme';

type Props = { onPress: () => void };

/** Above every screen and popup (Android stacks by elevation, iOS by zIndex). */
const ON_TOP = 1000;

export function DevButton({ onPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.dev.buttonLabel}
      onPress={onPress}
      style={[styles.touchArea, { right: spacing.md + insets.right, bottom: spacing.md + insets.bottom }]}
    >
      <Bevel kind="raised" fill={devColors.devButton} innerStyle={styles.face} testID="dev-button">
        <Text variant="action">{strings.dev.button}</Text>
      </Bevel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    position: 'absolute',
    minWidth: sizes.touchTarget,
    minHeight: sizes.touchTarget,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    zIndex: ON_TOP,
    elevation: ON_TOP,
  },
  face: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
