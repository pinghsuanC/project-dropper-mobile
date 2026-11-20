import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme';

// Pairing's two steps share one stack, so Back from step 2 returns to step 1. This Stack has
// its own screen containers: give them the desktop too, like the root Stack, or they show the
// platform's light grey.
export default function PairingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: styles.screen }} />;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.desktop },
});
