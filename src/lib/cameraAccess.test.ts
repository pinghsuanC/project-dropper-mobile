// What Open camera does, from the camera permission (context/details/1080).
import { cameraStep } from './cameraAccess';

test('still loading: nothing to do yet', () => {
  expect(cameraStep(null)).toBeNull();
});

test('already allowed: straight to the camera', () => {
  expect(cameraStep({ granted: true, canAskAgain: true, status: 'granted' })).toBe('camera');
});

test('never asked: our note first', () => {
  expect(cameraStep({ granted: false, canAskAgain: true, status: 'undetermined' })).toBe('note');
});

test('refused, but Android can still ask: ask again straight away, no note', () => {
  expect(cameraStep({ granted: false, canAskAgain: true, status: 'denied' })).toBe('ask');
});

// Still asked once: a blocked request returns at once with no prompt, and the reading can be
// out of date (Expo Go keeps its own per-project record on top of Android's).
test('reads as blocked: ask anyway; the answer decides', () => {
  expect(cameraStep({ granted: false, canAskAgain: false, status: 'denied' })).toBe('ask');
});
