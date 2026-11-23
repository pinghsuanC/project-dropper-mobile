import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { QrScanStep, type QrScanLook, type QrScanText } from '@/components/pairing/QrScanStep';
import { Balloon, ProgressBar, Text, Window } from '@/components/ui';
import { CLOUDFLARE_ACCESS_REQUIRED, MIN_CHECKING_MS } from '@/constants/config';
import { ServerConfigState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { useScreenState } from '@/lib/screenState';
import { applyServerConfig, type ServerConfigResult } from '@/lib/serverConfig';
import { serverConfigFrom, type ServerConfig } from '@/lib/serverConfigQr';
import { atLeast } from '@/lib/wait';
import { spacing } from '@/theme';

// The server config (context/details/1100), before Landing: scan the PC's server-config QR
// code (the shared scan, components/pairing/QrScanStep), check it with GET /health, keep it,
// and go back to Landing to start up. A failed check keeps nothing and shows its error over the
// scan. There's no ✕ and Back doesn't leave: the app can't start without a working server.

type Phase = { kind: 'scan'; look: QrScanLook; error?: string } | { kind: 'checking' };

const TEST_PHASES: Record<ServerConfigState, Phase> = {
  [ServerConfigState.CAMERA_NOTE]: { kind: 'scan', look: 'note' },
  [ServerConfigState.CAMERA]: { kind: 'scan', look: 'camera' },
  [ServerConfigState.CHECKING]: { kind: 'checking' },
  [ServerConfigState.ERROR]: { kind: 'scan', look: 'error', error: strings.serverConfig.refused },
};

const c = strings.serverConfig;

const TEXT: QrScanText = {
  balloonTitle: c.balloonTitle,
  balloonText: c.balloonText,
  windowTitle: c.windowTitle,
  notices: [c.noShare],
  prompt: c.scanPrompt,
  footnotes: [c.onceNote],
  wrongCode: c.notServerConfigQr,
};

/** Each failed check's error over the scan. */
const ERROR_TEXT: Record<Exclude<ServerConfigResult, 'ok'>, string> = {
  refused: c.refused,
  unreachable: c.unreachable,
  saveFailed: c.saveFailed,
};

export default function UpdateServerConfig() {
  const testState = useScreenState(ServerConfigState);
  const [phase, setPhase] = useState<Phase>(() => (testState ? TEST_PHASES[testState] : { kind: 'scan', look: 'start' }));
  // A new scan look after each failed check, so the scan starts again from its error.
  const [attempt, setAttempt] = useState(0);

  const check = useCallback(async (config: ServerConfig) => {
    setPhase({ kind: 'checking' });
    // Held for MIN_CHECKING_MS either way, so a fast answer doesn't flash by.
    const result = await atLeast(applyServerConfig(config), MIN_CHECKING_MS);
    if (result === 'ok') {
      router.replace('/');
      return;
    }
    setAttempt((n) => n + 1);
    setPhase({ kind: 'scan', look: 'error', error: ERROR_TEXT[result] });
  }, []);

  const onScan = useCallback(
    (data: string) => {
      const config = serverConfigFrom(data, { allowNoTunnel: !CLOUDFLARE_ACCESS_REQUIRED });
      if (!config) return false;
      void check(config);
      return true;
    },
    [check],
  );

  if (phase.kind === 'checking') {
    return (
      <ScrollView testID="server-config-checking" contentContainerStyle={styles.content}>
        <Balloon title={c.balloonTitle} text={c.balloonText} />
        <Window title={c.windowTitle}>
          <Text>{c.checking}</Text>
          <ProgressBar />
        </Window>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <QrScanStep
        key={attempt}
        text={TEXT}
        onScan={onScan}
        holdBack
        initialLook={phase.look}
        initialError={phase.error}
        testIDPrefix="server-config"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // The checking look sits in the middle of the screen, like Pairing step 2.
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
});
