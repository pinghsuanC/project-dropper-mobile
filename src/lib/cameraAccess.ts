// What Open camera does, from the camera permission (context/details/1080). Kept apart from
// the screen so the order is tested on its own.

/** The look Open camera leads to: the camera, our note before Android asks, or the error. */
export type CameraStep = 'camera' | 'note' | 'error';

/** The parts of expo-camera's PermissionResponse this needs. */
type CameraPermission = { granted: boolean; canAskAgain: boolean };

/** null while the permission is still loading: nothing to do yet. */
export function cameraStep(permission: CameraPermission | null): CameraStep | null {
  if (!permission) return null;
  if (permission.granted) return 'camera';
  // Android can still show its prompt: explain why first.
  if (permission.canAskAgain) return 'note';
  // Denied for good: only the system settings can change it now.
  return 'error';
}
