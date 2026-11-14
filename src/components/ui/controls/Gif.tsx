// The GIF for a slot (2040). Takes a slot, never a URL. Shows the slot's local GIF, or the
// black "GIF" placeholder when the slot has no file yet. Decorative: hidden from screen readers.
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { strings } from '@/constants/strings';
import { localGif, type GifSlot } from '@/lib/gifs';
import { colors, sizes } from '@/theme';

import { Bevel } from '../primitives/Bevel';
import { Text } from '../primitives/Text';

export type GifSize = keyof typeof sizes.gif;

type Props = {
  slot: GifSlot;
  size: GifSize;
  testID?: string;
};

export function Gif({ slot, size, testID }: Props) {
  const source = localGif(slot);
  return (
    <View
      testID={testID}
      style={sizeStyles[size]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Bevel
        kind="sunken"
        fill={colors.terminal}
        style={styles.frame}
        innerStyle={styles.inner}
        testID={testID ? `${testID}-bevel` : undefined}
      >
      {source !== undefined ? (
        <Image
          testID={testID ? `${testID}-image` : undefined}
          source={source}
          contentFit="contain"
          style={styles.image}
        />
      ) : (
        <Text variant="title" tone="inverse">
          {strings.ui.gifPlaceholder}
        </Text>
      )}
      </Bevel>
    </View>
  );
}

const sizeStyles = StyleSheet.create({
  small: { alignSelf: 'stretch', height: sizes.gif.small.height },
  large: { alignSelf: 'stretch', height: sizes.gif.large.height },
  half: { flex: 1, height: sizes.gif.half.height },
  popup: { width: sizes.gif.popup.width, height: sizes.gif.popup.height },
});

const styles = StyleSheet.create({
  frame: { flex: 1 },
  inner: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
