import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ResultPopup, Terminal } from '@/components/ui';
import { POPUP_REDIRECT_MS } from '@/constants/config';
import { strings } from '@/constants/strings';
import type { GifSlot } from '@/lib/gifs';
import { runStartup, type StartupOutcome } from '@/lib/startup';
import { useSession } from '@/state/session';
import { landingPopups, sizes, spacing } from '@/theme';

// Landing (context/details/1010): runs start-up, shows its outcome over the terminal, then
// moves on with router.replace so Back can't return here. Server unreachable waits for Retry.
// The server config (1100) goes straight to its screen, with no popup.

type Phase = 'connecting' | StartupOutcome;
/** The outcomes Landing shows a popup for. */
type PopupOutcome = Exclude<StartupOutcome, 'serverConfig'>;

/** Where Welcome and Not registered go once their popup has shown. */
const REDIRECTS: Partial<Record<Phase, Href>> = {
  welcome: '/home',
  notRegistered: '/register',
};

/** Each outcome's GIF slot, which is also its key in `landingPopups` (position). */
const POPUP_SLOT: Record<PopupOutcome, GifSlot & keyof typeof landingPopups> = {
  welcome: 'welcome',
  notRegistered: 'notWelcome',
  unreachable: 'offline',
};

export default function Landing() {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [attempt, setAttempt] = useState(0);
  const userName = useSession((s) => s.userName);

  // Run start-up on mount and on each Retry; ignore a result that arrives after unmount.
  useEffect(() => {
    let active = true;
    runStartup().then((outcome) => {
      if (active) setPhase(outcome);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  // Redirect once the popup has been up for POPUP_REDIRECT_MS; leaving early cancels it.
  useEffect(() => {
    if (phase === 'serverConfig') {
      router.replace('/update-server-config');
      return;
    }
    const target = REDIRECTS[phase];
    if (!target) return;
    const timer = setTimeout(() => router.replace(target), POPUP_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const retry = useCallback(() => {
    setPhase('connecting');
    setAttempt((n) => n + 1);
  }, []);

  return (
    <View style={styles.screen}>
      <Terminal lines={[strings.landing.connecting]} style={styles.terminal} />
      {phase === 'connecting' || phase === 'serverConfig' ? null : <OutcomePopup outcome={phase} userName={userName} onRetry={retry} />}
    </View>
  );
}

type PopupProps = { outcome: PopupOutcome; userName: string | null; onRetry: () => void };

function OutcomePopup({ outcome, userName, onRetry }: PopupProps) {
  const slot = POPUP_SLOT[outcome];
  const position = landingPopups[slot];
  const text = popupText(outcome, userName);

  return (
    <ResultPopup
      testID="landing-popup"
      title={text.title}
      slot={slot}
      message={text.message}
      button={outcome === 'unreachable' ? { label: strings.landing.retry, onPress: onRetry } : undefined}
      offset={position.offsetRight}
      style={[styles.popup, { marginTop: position.shiftY }]}
    />
  );
}

function popupText(outcome: PopupOutcome, userName: string | null): { title: string; message: string } {
  switch (outcome) {
    case 'welcome':
      return {
        title: strings.landing.welcomeTitle,
        message: userName ? strings.landing.welcome(userName) : strings.landing.welcomeNoName,
      };
    case 'notRegistered':
      return { title: strings.landing.notRegisteredTitle, message: strings.landing.notRegistered };
    case 'unreachable':
      return { title: strings.landing.unreachableTitle, message: strings.landing.unreachable };
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  terminal: { height: sizes.terminalHeight },
  popup: { top: '50%' },
});
