// Jest stand-in for expo-camera, used by every test (a root __mocks__ file replaces the node
// module automatically). The camera is a plain View, and tests drive it through the helpers:
// set the permission, choose what the system prompt answers, and fire a scan.
import { View, type ViewProps } from 'react-native';

type Permission = { granted: boolean; canAskAgain: boolean; status: 'granted' | 'denied' | 'undetermined' };
type ScanResult = { type: string; data: string };
type CameraProps = ViewProps & {
  onBarcodeScanned?: (result: ScanResult) => void;
  barcodeScannerSettings?: { barcodeTypes: string[] };
  facing?: 'front' | 'back';
};

const UNDECIDED: Permission = { granted: false, canAskAgain: true, status: 'undetermined' };
let permission: Permission | null = UNDECIDED;
let answer: Permission = { granted: true, canAskAgain: true, status: 'granted' };
let lastProps: CameraProps | undefined;

export const requestCameraPermission = jest.fn(async () => {
  permission = answer;
  return answer;
});

export function useCameraPermissions() {
  return [permission, requestCameraPermission, jest.fn(async () => permission)] as const;
}

export function CameraView(props: CameraProps) {
  lastProps = props;
  return <View testID="camera-view" {...props} />;
}

/** Test helpers. */
export const cameraMock = {
  setPermission(next: Permission | null) {
    permission = next;
  },
  /** What the system prompt answers when the app asks. */
  setAnswer(next: Permission) {
    answer = next;
  },
  /** The props the camera was last rendered with. */
  props: () => lastProps,
  /** Fires the camera's scan event, as the native view would. */
  scan(result: ScanResult) {
    lastProps?.onBarcodeScanned?.(result);
  },
  reset() {
    permission = UNDECIDED;
    answer = { granted: true, canAskAgain: true, status: 'granted' };
    lastProps = undefined;
    requestCameraPermission.mockClear();
  },
  GRANTED: { granted: true, canAskAgain: true, status: 'granted' } as Permission,
  UNDECIDED,
  DENIED: { granted: false, canAskAgain: true, status: 'denied' } as Permission,
  BLOCKED: { granted: false, canAskAgain: false, status: 'denied' } as Permission,
};
