import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import { QrCamera } from '@/components/pairing/QrCamera';
import { Balloon, Button, Dialog, Icon, Notice, ProgressBar, Text, Window } from '@/components/ui';
import { PairingScanState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { cameraStep } from '@/lib/cameraAccess';
import { useScreenState } from '@/lib/screenState';
import { printQrCode } from '@/lib/useQrScan';
import { spacing } from '@/theme';

// Pairing step 1 (context/details/1080). Four looks: step 1, the camera-access note, the
// camera, and the error. Open camera picks the next look from the camera permission
// (lib/cameraAccess.ts). A scanned code is only printed for now; step 2 will claim it.

type Look = 'stepOne' | 'note' | 'camera' | 'error';

const TEST_LOOKS: Record<PairingScanState, Look> = {
  [PairingScanState.CAMERA_NOTE]: 'note',
  [PairingScanState.CAMERA]: 'camera',
  [PairingScanState.ERROR]: 'error',
};

const p = strings.pairing;

export default function PairingScan() {
  const testState = useScreenState(PairingScanState);
  // A testing-menu state sets the first look; the buttons work from there as usual.
  const [look, setLook] = useState<Look>(() => (testState ? TEST_LOOKS[testState] : 'stepOne'));
  const [permission, requestPermission] = useCameraPermissions();
  const backToStepOne = useCallback(() => setLook('stepOne'), []);

  // Android Back closes the note, the error or the camera, back to step 1.
  useEffect(() => {
    if (look === 'stepOne') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backToStepOne();
      return true;
    });
    return () => sub.remove();
  }, [look, backToStepOne]);

  const openCamera = () => {
    const next = cameraStep(permission);
    if (next) setLook(next);
  };

  // A failed request (e.g. no activity to show Android's prompt) shows the error too, so the
  // note never stays stuck open.
  const askPermission = async () => {
    try {
      const answer = await requestPermission();
      setLook(answer.granted ? 'camera' : 'error');
    } catch {
      setLook('error');
    }
  };

  const onScan = useCallback(
    (data: string) => {
      printQrCode(data);
      backToStepOne();
    },
    [backToStepOne],
  );

  if (look === 'camera') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Window title={p.scanTitle} onClose={backToStepOne}>
          <Text>{p.pointCamera}</Text>
          <QrCamera onScan={onScan} />
          <ProgressBar />
          <Text variant="caption" tone="muted" align="center">
            {p.looking}
          </Text>
          <View style={styles.center}>
            <Button label={p.cancel} onPress={backToStepOne} />
          </View>
        </Window>
      </ScrollView>
    );
  }

  const popupOpen = look !== 'stepOne';
  return (
    <View style={styles.screen}>
      <ScrollView
        testID="pairing-step-one"
        contentContainerStyle={[styles.content, styles.stepOne]}
        // While a popup is open, TalkBack must stay in it (Dialog notes, 2010).
        importantForAccessibility={popupOpen ? 'no-hide-descendants' : 'auto'}
      >
        <Balloon title={p.balloonTitle} text={p.balloonText} />
        <Window title={p.stepOneTitle} onClose={leavePairing}>
          <Notice text={p.noShare} />
          <Notice text={p.validFor} />
          <Text>{p.scanPrompt}</Text>
          <View style={styles.center}>
            <Button variant="large" label={p.openCamera} icon={<Icon name="camera" />} onPress={openCamera} />
          </View>
          <Text variant="caption" tone="muted">
            {p.fingerprintNote}
          </Text>
          <Text variant="caption" tone="muted">
            {p.onePcNote}
          </Text>
        </Window>
      </ScrollView>

      {look === 'note' ? (
        <Dialog
          kind="info"
          title={p.cameraNoteTitle}
          heading={p.cameraNoteHeading}
          message={p.cameraNote}
          primary={{ label: p.continue, onPress: () => void askPermission() }}
          secondary={{ label: p.notNow, onPress: backToStepOne }}
          testID="pairing-note"
        />
      ) : null}
      {look === 'error' ? (
        <Dialog kind="error" message={p.scanError} primary={{ label: p.ok, onPress: backToStepOne }} testID="pairing-error" />
      ) : null}
    </View>
  );
}

/** ✕ on step 1: back where the user came from (Home), or Home when opened directly. */
function leavePairing() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  // Step 1 sits in the middle of the screen, as in the prototype.
  stepOne: { flexGrow: 1, justifyContent: 'center' },
  center: { alignItems: 'center' },
});
