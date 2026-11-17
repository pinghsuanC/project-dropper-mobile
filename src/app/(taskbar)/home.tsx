import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Balloon, Button, ConfirmWindow, Gif, Icon, Text, Window, type IconName } from '@/components/ui';
import { HomeState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { dateText, greetingText } from '@/lib/greeting';
import { checkConnection } from '@/lib/homeCheck';
import { quoteForDate } from '@/lib/quotes';
import { useScreenState } from '@/lib/screenState';
import { useNow } from '@/lib/useNow';
import { useSession } from '@/state/session';
import { sizes, spacing, type TextTone } from '@/theme';

// Home (context/details/1060). Four looks: checking, not connected to a PC, connected, and
// can't reach the server. The look comes from the connection check Home runs when it opens
// (lib/homeCheck.ts; Retry runs it again), or from a testing-menu state, which skips it.

type Look = 'checking' | 'unpaired' | 'paired' | 'serverError';

const h = strings.home;

/** What each look shows in the main window. */
// `go` is left out where the button does something on Home itself (Retry) or nothing (Checking).
const LOOKS: Record<
  Look,
  {
    title: string;
    action: { label: string; icon: IconName; go?: () => void };
    status?: { text: string; tone: TextTone };
    upload: boolean;
  }
> = {
  // While the check runs, as in the prototype (home-paired-01): the button is disabled.
  checking: {
    title: h.titlePaired,
    action: { label: h.checking, icon: 'globe' },
    status: { text: h.checking, tone: 'muted' },
    upload: true,
  },
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
    action: { label: h.retry, icon: 'retry' },
    status: { text: h.serverError, tone: 'error' },
    upload: true,
  },
};

const TEST_LOOKS: Record<HomeState, Look> = {
  [HomeState.UNPAIRED]: 'unpaired',
  [HomeState.PAIRED]: 'paired',
  [HomeState.CHECKING]: 'checking',
  [HomeState.SERVER_ERROR]: 'serverError',
};

export default function Home() {
  const testState = useScreenState(HomeState);
  const userName = useSession((s) => s.userName);
  const quote = useSession((s) => s.quote);
  const setQuote = useSession((s) => s.setQuote);
  const [checked, setChecked] = useState<Look>('checking');
  const now = useNow();
  const today = dateText(now);

  // Check once when Home opens (it starts in 'checking'); a testing-menu state shows its look
  // instead. The result is dropped if Home has closed meanwhile.
  useEffect(() => {
    if (testState) return;
    let current = true;
    void checkConnection().then((result) => {
      if (current) setChecked(result);
    });
    return () => {
      current = false;
    };
  }, [testState]);

  const retry = useCallback(async () => {
    setChecked('checking');
    setChecked(await checkConnection());
  }, []);

  // A new quote each calendar day, also when Home stays open past midnight.
  useEffect(() => {
    setQuote(quoteForDate(now).text);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the day changes
  }, [today, setQuote]);

  const lookName = testState ? TEST_LOOKS[testState] : checked;
  const look = LOOKS[lookName];
  const onAction = lookName === 'serverError' ? () => void retry() : (look.action.go ?? (() => {}));

  return (
    <ScrollView testID="home-content" contentContainerStyle={styles.content}>
      <Balloon title={greetingText(now, userName)} label={h.quoteLabel} text={quote.text} />
      <View style={styles.gifPair}>
        <Gif slot="homeLeft" size="half" testID="home-gif-left" />
        <Gif slot="homeRight" size="half" testID="home-gif-right" />
      </View>

      <Window title={look.title}>
        <Text>{today}</Text>
        <Gif slot="homeMain" size="small" testID="home-gif-main" />
        <View testID="home-actions" style={styles.actions}>
          <Button
            variant="large"
            label={look.action.label}
            icon={<Icon name={look.action.icon} testID={`home-icon-${look.action.icon}`} />}
            onPress={onAction}
            disabled={lookName === 'checking'}
          />
          {look.status ? (
            <View testID="home-status" style={styles.status} accessibilityLiveRegion="polite">
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
