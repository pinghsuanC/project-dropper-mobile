// Inline (non-modal) question in a Window: a prompt, an optional muted note, and two buttons (2010). Its title-bar
// buttons are all disabled, so it can't be closed: the screen decides when it shows.
import { StyleSheet, View } from 'react-native';

import { sizes, spacing } from '@/theme';

import { Button } from '../controls/Button';
import { Window } from '../controls/Window';
import { Text } from '../primitives/Text';

type Choice = { label: string; onPress: () => void; disabled?: boolean };

type Props = {
  title: string;
  prompt: string;
  /** Muted small print under the prompt. */
  note?: string;
  primary: Choice;
  secondary: Choice;
  testID?: string;
};

export function ConfirmWindow({ title, prompt, note, primary, secondary, testID }: Props) {
  return (
    <Window title={title} testID={testID}>
      <Text>{prompt}</Text>
      {note ? (
        <Text variant="caption" tone="muted">
          {note}
        </Text>
      ) : null}
      <View style={styles.buttons}>
        {[primary, secondary].map((choice) => (
          <Button
            key={choice.label}
            label={choice.label}
            onPress={choice.onPress}
            disabled={choice.disabled}
            style={styles.button}
          />
        ))}
      </View>
    </Window>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  button: { minWidth: sizes.dialogButtonWidth },
});
