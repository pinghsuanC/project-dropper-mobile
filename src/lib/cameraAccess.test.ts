import { cameraStep } from './cameraAccess';

test('still loading: nothing to do yet', () => {
  expect(cameraStep(null)).toBeNull();
});

test('already allowed: straight to the camera', () => {
  expect(cameraStep({ granted: true, canAskAgain: true })).toBe('camera');
});

test('not asked yet: our note first', () => {
  expect(cameraStep({ granted: false, canAskAgain: true })).toBe('note');
});

test('denied once but Android can still ask: the note again', () => {
  expect(cameraStep({ granted: false, canAskAgain: true })).toBe('note');
});

test('denied for good: the error', () => {
  expect(cameraStep({ granted: false, canAskAgain: false })).toBe('error');
});
