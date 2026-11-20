// What Open camera does, from the camera permission (context/details/1080). Kept apart from
// the screen so the order is tested on its own.

/**
 * The step Open camera leads to: the camera, our note before Android's first prompt, or
 * asking now (the answer then decides: camera, the error, or the Settings error).
 */
export type CameraStep = 'camera' | 'note' | 'ask';

/** The parts of expo-camera's PermissionResponse this needs. */
export type CameraPermission = { granted: boolean; canAskAgain: boolean; status: string };

/** null while the permission is still loading: nothing to do yet. */
export function cameraStep(permission: CameraPermission | null): CameraStep | null {
  if (!permission) return null;
  if (permission.granted) return 'camera';
  // Never asked: explain why first.
  if (permission.status === 'undetermined') return 'note';
  // Refused before, even "blocked": ask now. A blocked request returns at once without a
  // prompt, and the reading can be out of date (Expo Go keeps its own per-project record on
  // top of Android's), so the answer, not this reading, decides what shows next.
  return 'ask';
}
