// Font files loaded at start-up. Each key becomes a font family name, which theme.ts
// `fonts` refers to; the root layout passes this map to useFonts.
import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible';
import { CourierPrime_400Regular } from '@expo-google-fonts/courier-prime';
import { Silkscreen_400Regular } from '@expo-google-fonts/silkscreen';
import { VT323_400Regular } from '@expo-google-fonts/vt323';

export const fontFiles = {
  Silkscreen_400Regular,
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
  CourierPrime_400Regular,
  VT323_400Regular,
};
