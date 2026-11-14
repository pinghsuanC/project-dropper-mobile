import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ResultPopup, Terminal, Text } from '@/components/ui';
import { strings } from '@/constants/strings';
import { landingPopups, sizes, spacing } from '@/theme';

// Landing. For now a static preview of its look (the "Not registered" state from
// landing-failed.png); the next feature reads storage, picks the popup and redirects.
export default function Landing() {
  const popup = landingPopups.notWelcome;

  return (
    <View style={styles.screen}>
      <Terminal lines={[strings.landing.connecting]} style={styles.terminal} />
      <ResultPopup
        title={strings.landing.notRegisteredTitle}
        slot="notWelcome"
        message={strings.landing.notRegistered}
        offset={popup.offsetRight}
        style={[styles.popup, { marginTop: popup.shiftY }]}
      />
      <View style={styles.links}>
        <Link href="/home">
          <Text variant="label" tone="inverse">
            {strings.landing.toHome}
          </Text>
        </Link>
        <Link href="/register">
          <Text variant="label" tone="inverse">
            {strings.landing.toRegister}
          </Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  terminal: { height: sizes.terminalHeight },
  popup: { top: '50%' },
  links: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xl,
  },
});
