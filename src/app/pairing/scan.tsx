import { router } from 'expo-router';
import { useCallback } from 'react';

import { QrScanStep, type QrScanLook, type QrScanText } from '@/components/pairing/QrScanStep';
import { PairingScanState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { pairingTokenFrom } from '@/lib/pairingQr';
import { useScreenState } from '@/lib/screenState';
import { getSession } from '@/state/session';

// Pairing step 1 (context/details/1080): the shared QR scan (components/pairing/QrScanStep)
// with Pairing's text. A pairing QR hands its code to step 2 through the session (never a
// route param, a log or the screen); any other QR shows "That isn't a … pairing code".

const TEST_LOOKS: Record<PairingScanState, QrScanLook> = {
  [PairingScanState.CAMERA_NOTE]: 'note',
  [PairingScanState.CAMERA]: 'camera',
  [PairingScanState.ERROR]: 'error',
};

const p = strings.pairing;

const TEXT: QrScanText = {
  balloonTitle: p.balloonTitle,
  balloonText: p.balloonText,
  windowTitle: p.stepOneTitle,
  notices: [p.noShare, p.validFor],
  prompt: p.scanPrompt,
  footnotes: [p.fingerprintNote, p.onePcNote],
  wrongCode: p.notPairingQr,
};

export default function PairingScan() {
  const testState = useScreenState(PairingScanState);

  const onScan = useCallback((data: string) => {
    const token = pairingTokenFrom(data);
    if (!token) return false;
    getSession().setPairingToken(token);
    router.push('/pairing/wait');
    return true;
  }, []);

  return (
    <QrScanStep
      text={TEXT}
      onScan={onScan}
      onClose={leavePairing}
      initialLook={testState ? TEST_LOOKS[testState] : 'start'}
      testIDPrefix="pairing"
    />
  );
}

/** ✕ on step 1: back where the user came from (Home), or Home when opened directly. */
function leavePairing() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}
