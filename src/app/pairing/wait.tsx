import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { claimPairing } from '@/api/pairing';
import { Balloon, Dialog, ProgressBar, Text, Window } from '@/components/ui';
import { PairingWaitState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { useScreenState } from '@/lib/screenState';
import { getSession } from '@/state/session';
import { spacing } from '@/theme';

// Pairing step 2 (context/details/1080): claim the code step 1 read from the PC's QR. Paired:
// keep the PC in the session and go to Home (Connected). Any failure: the Error Dialog, whose
// Back returns to step 1 to scan again. The code comes through the session, read once.

type Look = 'waiting' | 'error';

const TEST_LOOKS: Record<PairingWaitState, Look> = {
  [PairingWaitState.WAITING]: 'waiting',
  [PairingWaitState.ERROR]: 'error',
};

const p = strings.pairing;

export default function PairingWait() {
  const testState = useScreenState(PairingWaitState);
  // Read once: the code is used for one claim only, then leaves the session.
  const [token] = useState(() => getSession().pairingToken);
  const [look, setLook] = useState<Look>(() => (testState ? TEST_LOOKS[testState] : token ? 'waiting' : 'error'));
  const claimed = useRef(false);

  useEffect(() => {
    // A testing-menu look calls nothing; the ref keeps a re-run effect from claiming twice.
    if (testState || claimed.current) return;
    claimed.current = true;
    getSession().setPairingToken(null);
    if (!token) return;
    claimPairing(token).then(
      (pc) => {
        getSession().setPairedWith({ pcName: pc.name, deviceId: pc.device_id });
        router.dismissTo('/home');
      },
      () => setLook('error'),
    );
  }, [testState, token]);

  const error = look === 'error';
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        // While the error is open, TalkBack must stay in it (Dialog notes, 2010).
        importantForAccessibility={error ? 'no-hide-descendants' : 'auto'}
      >
        <Balloon title={p.stepTwoBalloonTitle} text={p.stepTwoBalloonText} />
        <Window title={p.stepTwoTitle}>
          <Text>{p.waiting}</Text>
          <ProgressBar />
        </Window>
      </ScrollView>

      {error ? (
        <Dialog kind="error" message={p.claimError} primary={{ label: p.back, onPress: backToScan }} testID="pairing-wait-error" />
      ) : null}
    </View>
  );
}

/** Back to step 1 to scan again (step 1 when there's nothing behind this screen). */
function backToScan() {
  if (router.canGoBack()) router.back();
  else router.replace('/pairing/scan');
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Step 2 sits in the middle of the screen, as in the prototype.
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
});
