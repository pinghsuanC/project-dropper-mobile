// The live camera of Pairing step 1 (context/details/1080): the back camera, reading QR codes
// only, in a black square with four white corner brackets as an aim guide. Each mount reads
// one code (useQrScan), so closing and reopening the camera reads a new one.
import { CameraView } from 'expo-camera';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useQrScan } from '@/lib/useQrScan';
import { colors, sizes } from '@/theme';

type Props = {
  /** The text of the first QR code seen. */
  onScan: (data: string) => void;
};

const QR_ONLY = { barcodeTypes: ['qr' as const] };
const CORNERS = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;

export function QrCamera({ onScan }: Props) {
  const onBarcodeScanned = useQrScan(onScan);
  return (
    <View style={styles.frame}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={QR_ONLY}
        onBarcodeScanned={onBarcodeScanned}
      />
      {CORNERS.map((corner) => (
        <View
          key={corner}
          testID={`qr-bracket-${corner}`}
          style={[styles.bracket, styles[corner]]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ))}
    </View>
  );
}

const b = sizes.qrBracket;
const arm = (sides: ViewStyle): ViewStyle => ({ ...sides, borderColor: colors.field });

const styles = StyleSheet.create({
  frame: { aspectRatio: 1, width: '100%', backgroundColor: colors.terminal, overflow: 'hidden' },
  bracket: { position: 'absolute', width: b.length, height: b.length },
  topLeft: arm({ top: b.inset, left: b.inset, borderTopWidth: b.stroke, borderLeftWidth: b.stroke }),
  topRight: arm({ top: b.inset, right: b.inset, borderTopWidth: b.stroke, borderRightWidth: b.stroke }),
  bottomLeft: arm({ bottom: b.inset, left: b.inset, borderBottomWidth: b.stroke, borderLeftWidth: b.stroke }),
  bottomRight: arm({ bottom: b.inset, right: b.inset, borderBottomWidth: b.stroke, borderRightWidth: b.stroke }),
});
