// The GIF for a slot (2040). Takes a slot, never a URL. Shows the slot's local GIF straight on
// the screen, with no frame or background. A slot with no file yet keeps its space empty, so
// the layout doesn't shift once a file arrives. Decorative: hidden from screen readers.
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { localGif, type GifSlot } from '@/lib/gifs';
import { sizes } from '@/theme';

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
      {source !== undefined ? (
        <Image
          testID={testID ? `${testID}-image` : undefined}
          source={source}
          contentFit="contain"
          style={styles.image}
        />
      ) : null}
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
  image: { width: '100%', height: '100%' },
});
