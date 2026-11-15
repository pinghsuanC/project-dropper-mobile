import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DevButton } from '@/components/dev/DevButton';
import { fontFiles } from '@/components/ui/fonts';
import { SHOW_TESTING_MENU } from '@/constants/config';
import { colors } from '@/theme';

// Keep the splash screen up until the fonts are ready.
SplashScreen.preventAutoHideAsync();

/** The testing menu's route name in the root stack (src/app/dev.tsx). */
const DEV_ROUTE = 'dev';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  // On a font error, carry on with the system fonts rather than staying on the splash screen.
  const ready = fontsLoaded || fontError !== null;
  const pathname = usePathname();
  const navigation = useNavigationContainerRef();

  // The DEV button resets the whole history (nested stacks too) so the menu is the only
  // screen; router.dismissAll() would only clear the closest stack. Expo Router puts this
  // layout's Stack inside a top-level route of its own, so the reset targets that Stack.
  // A RESET needs the complete state (key, routeNames, …): keep the Stack's own and swap
  // its routes; the router gives the new route its key.
  const openTestingMenu = useCallback(() => {
    const stack = navigation.getRootState().routes[0]?.state;
    if (!stack?.key) return;
    navigation.dispatch({
      type: 'RESET',
      payload: { ...stack, stale: false, index: 0, routes: [{ name: DEV_ROUTE }] },
      target: stack.key,
    });
  }, [navigation]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: styles.screen }} />
      {SHOW_TESTING_MENU && pathname !== `/${DEV_ROUTE}` ? <DevButton onPress={openTestingMenu} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.desktop },
  screen: { backgroundColor: colors.desktop },
});
