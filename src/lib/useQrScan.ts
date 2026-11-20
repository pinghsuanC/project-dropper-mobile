// Turns the camera's scan events into one call per camera opening (context/details/1080).
// The camera fires onBarcodeScanned many times a second while a code is in view, so only the
// first QR code with text counts; a camera opened again (a new mount) reads a new one.
import { useCallback, useRef } from 'react';

/** The parts of expo-camera's BarcodeScanningResult this reads. */
export type QrScanEvent = { type: string; data: string };

const QR = 'qr';

/** A handler for CameraView's `onBarcodeScanned` that calls `onScan(text)` once. */
export function useQrScan(onScan: (data: string) => void) {
  const done = useRef(false);
  return useCallback(
    ({ type, data }: QrScanEvent) => {
      if (done.current || type !== QR || !data) return;
      done.current = true;
      onScan(data);
    },
    [onScan],
  );
}
