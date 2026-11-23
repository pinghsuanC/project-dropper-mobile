import { useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { QrCamera } from '@/components/pairing/QrCamera';
import { Balloon, Button, Dialog, Icon, Notice, ProgressBar, Text, Window } from '@/components/ui';
import { strings } from '@/constants/strings';
import { cameraStep, type CameraPermission } from '@/lib/cameraAccess';
import { sizes, spacing } from '@/theme';

// Scanning a QR code on the PC (context/details/1080, 1100): Pairing step 1 and the server
// config. Four looks: the start, the camera-access note, the camera, and the error. Open camera
// picks the next look from the camera permission (lib/cameraAccess.ts). Only the text and what a
// scanned code does differ between the screens; the scanned text is never logged or shown.

export type QrScanLook = 'start' | 'note' | 'camera' | 'error';

/** The text that differs per screen. The camera note, window and errors are `strings.qrScan`. */
export type QrScanText = {
  balloonTitle: string;
  balloonText: string;
  windowTitle: string;
  /** Warning Notices above the prompt. */
  notices: readonly string[];
  prompt: string;
  /** Muted notes under Open camera. */
  footnotes: readonly string[];
  /** The error for a QR code this screen doesn't take. */
  wrongCode: string;
};

type Props = {
  text: QrScanText;
  /** A scanned QR's text. Return true when the screen takes it (and moves on), false for `text.wrongCode`. */
  onScan: (data: string) => boolean;
  /** ✕ on the start look. None: no ✕. */
  onClose?: () => void;
  /** Android Back on the start look does nothing: there's no screen to go back to. */
  holdBack?: boolean;
  /** The first look (a testing-menu state, or the error after a failed check). */
  initialLook?: QrScanLook;
  /** The error's text when `initialLook` is `error`. Default: the camera-access error. */
  initialError?: string;
  /** Prefix of the test IDs: `<prefix>-start`, `-open-camera`, `-note`, `-error`. */
  testIDPrefix: string;
};

/** Which error: a fixed message (the camera error, the wrong code, a screen's own) or camera blocked by Android. */
type ScanError = { kind: 'message'; text: string } | { kind: 'blocked' };

const s = strings.qrScan;

export function QrScanStep({ text, onScan, onClose, holdBack = false, initialLook = 'start', initialError, testIDPrefix }: Props) {
  const [look, setLook] = useState<QrScanLook>(initialLook);
  const [error, setError] = useState<ScanError>({ kind: 'message', text: initialError ?? s.scanError });
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const backToStart = useCallback(() => setLook('start'), []);

  // Android Back closes the note, the error or the camera, back to the start look. On the start
  // look it goes back as usual, unless holdBack keeps the user here.
  useEffect(() => {
    if (look === 'start' && !holdBack) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backToStart();
      return true;
    });
    return () => sub.remove();
  }, [look, holdBack, backToStart]);

  const showError = useCallback((next: ScanError) => {
    setError(next);
    setLook('error');
  }, []);

  // Asks Android. A refusal that Android now blocks shows the Settings error; a failed request
  // (e.g. no activity to show the prompt) shows the error too, so the note never stays stuck.
  const askPermission = async () => {
    try {
      const answer = await requestPermission();
      if (answer.granted) setLook('camera');
      else showError(answer.canAskAgain ? { kind: 'message', text: s.scanError } : { kind: 'blocked' });
    } catch {
      showError({ kind: 'message', text: s.scanError });
    }
  };

  const openSettings = () => {
    backToStart();
    void Linking.openSettings();
  };

  // Reads the permission as it is now, so turning the camera on in Settings and coming back
  // works; the hook's last value is the fallback.
  const openCamera = async () => {
    let current: CameraPermission | null = permission;
    try {
      current = await getPermission();
    } catch {
      // keep the hook's value
    }
    const step = cameraStep(current);
    if (step === 'camera' || step === 'note') setLook(step);
    else if (step === 'ask') await askPermission();
  };

  const handleScan = useCallback(
    (data: string) => {
      if (onScan(data)) backToStart();
      else showError({ kind: 'message', text: text.wrongCode });
    },
    [onScan, backToStart, showError, text.wrongCode],
  );

  if (look === 'camera') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Window title={s.scanTitle} onClose={backToStart}>
          <Text>{s.pointCamera}</Text>
          <QrCamera onScan={handleScan} />
          <ProgressBar />
          <Text variant="caption" tone="muted" align="center">
            {s.looking}
          </Text>
          <View style={styles.center}>
            <Button label={s.cancel} onPress={backToStart} />
          </View>
        </Window>
      </ScrollView>
    );
  }

  const popupOpen = look !== 'start';
  const blocked = error.kind === 'blocked';
  return (
    <View style={styles.screen}>
      <ScrollView
        testID={`${testIDPrefix}-start`}
        contentContainerStyle={[styles.content, styles.start]}
        // While a popup is open, TalkBack must stay in it (Dialog notes, 2010).
        importantForAccessibility={popupOpen ? 'no-hide-descendants' : 'auto'}
      >
        <Balloon title={text.balloonTitle} text={text.balloonText} />
        <Window title={text.windowTitle} onClose={onClose}>
          {text.notices.map((notice) => (
            <Notice key={notice} text={notice} />
          ))}
          <Text>{text.prompt}</Text>
          <View style={styles.center}>
            <Button
              variant="large"
              label={s.openCamera}
              icon={<Icon name="camera" />}
              onPress={() => void openCamera()}
              style={styles.cameraButton}
              testID={`${testIDPrefix}-open-camera`}
            />
          </View>
          {text.footnotes.map((note) => (
            <Text key={note} variant="caption" tone="muted">
              {note}
            </Text>
          ))}
        </Window>
      </ScrollView>

      {look === 'note' ? (
        <Dialog
          kind="info"
          title={s.cameraNoteTitle}
          heading={s.cameraNoteHeading}
          message={s.cameraNote}
          primary={{ label: s.continue, onPress: () => void askPermission() }}
          secondary={{ label: s.notNow, onPress: backToStart }}
          testID={`${testIDPrefix}-note`}
        />
      ) : null}
      {look === 'error' ? (
        <Dialog
          kind="error"
          message={blocked ? s.cameraBlocked : error.text}
          // Blocked: Settings is the only way on, so it's the default button (closing the error,
          // so the start look is ready when the user comes back); OK just closes.
          primary={blocked ? { label: s.openSettings, onPress: openSettings } : { label: s.ok, onPress: backToStart }}
          secondary={blocked ? { label: s.ok, onPress: backToStart } : undefined}
          testID={`${testIDPrefix}-error`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  // The start look sits in the middle of the screen, as in the prototype.
  start: { flexGrow: 1, justifyContent: 'center' },
  center: { alignItems: 'center' },
  // A set width: left to size itself, this large button stretched down the screen (1080).
  cameraButton: { width: sizes.pairingCameraButton },
});
