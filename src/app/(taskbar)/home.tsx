import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Balloon, Button, ConfirmWindow, Gif, Icon, Text, Window, type IconName } from '@/components/ui';
import { HomeState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { dateText, greetingText } from '@/lib/greeting';
import { useScreenState } from '@/lib/screenState';
import { useSession } from '@/state/session';
import { sizes, spacing, type TextTone } from '@/theme';

// Home (context/details/1060), Part 1: UI and redirection. Three looks: not connected to a PC,
// connected, and can't reach the server. The look comes from the session's `pairedWith`
// (pairing routes are 🚧 on the server, so it's null for now) or from a testing-menu state.

type Look = 'unpaired' | 'paired' | 'serverError';

const h = strings.home;

/** What each look shows in the main window. */
const LOOKS: Record<
  Look,
  {
    title: string;
    action: { label: string; icon: IconName; go: () => void };
    status?: { text: string; tone: TextTone };
    upload: boolean;
  }
> = {
  unpaired: {
    title: h.titleUnpaired,
    action: { label: h.connect, icon: 'monitor', go: () => router.push('/pairing/scan') },
    upload: false,
  },
  paired: {
    title: h.titlePaired,
    action: { label: h.viewServerFiles, icon: 'globe', go: () => router.push('/server-files') },
    status: { text: h.serverConnected, tone: 'success' },
    upload: true,
  },
  serverError: {
    title: h.titleServerError,
    // Part 1: back to the plain Home, as in the prototype; Part 2 makes it a real re-check.
    action: { label: h.retry, icon: 'retry', go: () => router.replace('/home') },
    status: { text: h.serverError, tone: 'error' },
    upload: true,
  },
};

const TEST_LOOKS: Record<HomeState, Look> = {
  [HomeState.UNPAIRED]: 'unpaired',
  [HomeState.PAIRED]: 'paired',
  [HomeState.SERVER_ERROR]: 'serverError',
};

export default function Home() {
  const testState = useScreenState(HomeState);
  const pairedWith = useSession((s) => s.pairedWith);
  const userName = useSession((s) => s.userName);
  const quote = useSession((s) => s.quote);

  const look = LOOKS[testState ? TEST_LOOKS[testState] : pairedWith ? 'paired' : 'unpaired'];
  const now = new Date();

  return (
    <ScrollView testID="home-content" contentContainerStyle={styles.content}>
      <Balloon title={greetingText(now, userName)} label={h.quoteLabel} text={quote.text} />
      <View style={styles.gifPair}>
        <Gif slot="homeLeft" size="half" testID="home-gif-left" />
        <Gif slot="homeRight" size="half" testID="home-gif-right" />
      </View>

      <Window title={look.title}>
        <Text>{dateText(now)}</Text>
        <Gif slot="homeMain" size="small" testID="home-gif-main" />
        <View testID="home-actions" style={styles.actions}>
          <Button
            variant="large"
            label={look.action.label}
            icon={<Icon name={look.action.icon} testID={`home-icon-${look.action.icon}`} />}
            onPress={look.action.go}
          />
          {look.status ? (
            <View style={styles.status} accessibilityLiveRegion="polite">
              <Text bold align="center" tone={look.status.tone}>
                {look.status.text}
              </Text>
            </View>
          ) : null}
        </View>
      </Window>

      {look.upload ? (
        <ConfirmWindow
          title={h.uploadTitle}
          prompt={h.uploadPrompt}
          primary={{ label: h.yes, onPress: () => router.push('/upload') }}
          // No stays disabled, as in the prototype: this window can't be dismissed (1060).
          secondary={{ label: h.no, onPress: () => {}, disabled: true }}
          testID="home-upload"
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  gifPair: { flexDirection: 'row', gap: spacing.lg },
  // The button gets its width from the window (stretched, inset), not from its label: sized by
  // content, Android measured the label with the icon beside it as nearly zero wide, and the
  // button grew to the height of one letter per line (1060).
  actions: { alignItems: 'stretch', paddingHorizontal: sizes.homeActionInset, gap: spacing.md },
  status: { minHeight: sizes.statusLineHeight, justifyContent: 'center' },
});
