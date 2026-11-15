// A start-up result shown over the terminal: GIF, message, optional button; its title-bar
// buttons are disabled (2010). `offset` hangs it off the right edge by that many points;
// the body is padded by the same amount so its content stays centred in the visible part.
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import type { GifSlot } from '@/lib/gifs';
import { sizes, spacing } from '@/theme';

import { Button } from '../controls/Button';
import { Gif } from '../controls/Gif';
import { Window } from '../controls/Window';
import { Text } from '../primitives/Text';

type Props = {
  title: string;
  slot: GifSlot;
  message: string;
  button?: { label: string; onPress: () => void };
  /** How far the popup hangs off the right edge. */
  offset?: number;
  /** Vertical position (e.g. top), set by the screen. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ResultPopup({ title, slot, message, button, offset = 0, style, testID }: Props) {
  return (
    <Window
      title={title}
      style={[styles.popup, { right: offset > 0 ? -offset : 0 }, style]}
      bodyStyle={[styles.body, { paddingRight: spacing.lg + offset }]}
      testID={testID}
    >
      <Gif slot={slot} size="popup" testID={testID ? `${testID}-gif` : undefined} />
      <Text align="center">{message}</Text>
      {button ? <Button label={button.label} onPress={button.onPress} /> : null}
    </Window>
  );
}

const styles = StyleSheet.create({
  popup: { position: 'absolute', width: sizes.popupWidth },
  body: { alignItems: 'center' },
});
