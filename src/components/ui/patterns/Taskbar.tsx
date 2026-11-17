// Bottom strip with the Start-style Properties button (2010), shown by the (taskbar) layout.
// It sits in normal layout at the bottom; the root SafeAreaView keeps it above Android's
// gesture bar.
import { StyleSheet, View } from 'react-native';

import { strings } from '@/constants/strings';
import { borders, colors, sizes, spacing } from '@/theme';

import { Button } from '../controls/Button';
import { Icon } from '../controls/Icon';

type Props = {
  onProperties: () => void;
  testID?: string;
};

export function Taskbar({ onProperties, testID }: Props) {
  return (
    <View testID={testID} style={styles.bar}>
      <Button
        variant="start"
        label={strings.taskbar.properties}
        icon={<Icon name="gear" size="start" testID={testID ? `${testID}-gear` : undefined} />}
        onPress={onProperties}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: sizes.taskbarHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.face,
    borderTopWidth: borders.line * 2,
    borderTopColor: colors.bevelLight,
  },
});
