import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fontFiles } from '@/components/ui/fonts';
import { colors } from '@/theme';

// Keep the splash screen up until the fonts are ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  // On a font error, carry on with the system fonts rather than staying on the splash screen.
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: styles.screen }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.desktop },
  screen: { backgroundColor: colors.desktop },
});
