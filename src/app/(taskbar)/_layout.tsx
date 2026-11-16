// Screens that show the taskbar (Home in every look, Server files, Upload): the Taskbar
// component with its Properties button sits under them (2010, 1060).
import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Taskbar } from '@/components/ui';
import { colors } from '@/theme';

export default function TaskbarLayout() {
  return (
    <View style={styles.root}>
      <View style={styles.screens}>
        {/* This Stack has its own screen containers: give them the desktop too, like the root
            Stack, or they show the platform's light grey. */}
        <Stack screenOptions={{ headerShown: false, contentStyle: styles.screen }} />
      </View>
      <Taskbar onProperties={() => router.push('/properties')} testID="taskbar" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screens: { flex: 1 },
  screen: { backgroundColor: colors.desktop },
});
