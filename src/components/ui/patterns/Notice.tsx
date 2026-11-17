// One-line icon + bold text, e.g. a warning above a form (2010).
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { Icon } from '../controls/Icon';
import { Text } from '../primitives/Text';

type Props = {
  text: string;
  testID?: string;
};

export function Notice({ text, testID }: Props) {
  return (
    <View testID={testID} style={styles.row}>
      <Icon name="warning" testID={testID ? `${testID}-icon` : undefined} />
      <View style={styles.text}>
        <Text bold>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
});
