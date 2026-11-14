// Screens that show the taskbar (Home, Server files, Upload). For now the taskbar is
// just its "Properties" link; the Taskbar component replaces it later (2010).
import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { strings } from '@/constants/strings';

export default function TaskbarLayout() {
  return (
    <View style={styles.root}>
      <View style={styles.screens}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <Link href="/properties">{strings.taskbar.properties}</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screens: { flex: 1 },
});
