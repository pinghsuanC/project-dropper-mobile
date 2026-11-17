import { render, screen } from '@testing-library/react-native';
import * as camera from 'expo-camera';

import { QrCamera } from './QrCamera';

// The same module instance the app code gets (a root __mocks__ file).
const { cameraMock } = camera as unknown as typeof import('../../../__mocks__/expo-camera');

beforeEach(() => cameraMock.reset());

test('uses the back camera and looks for QR codes only', async () => {
  await render(<QrCamera onScan={jest.fn()} />);
  expect(screen.getByTestId('camera-view')).toBeTruthy();
  expect(cameraMock.props()).toMatchObject({ facing: 'back', barcodeScannerSettings: { barcodeTypes: ['qr'] } });
});

test('a scanned QR code reaches onScan once', async () => {
  const onScan = jest.fn();
  await render(<QrCamera onScan={onScan} />);
  cameraMock.scan({ type: 'qr', data: 'code' });
  cameraMock.scan({ type: 'qr', data: 'code' });
  expect(onScan).toHaveBeenCalledTimes(1);
  expect(onScan).toHaveBeenCalledWith('code');
});

test('a new camera (opened again) reads a new code', async () => {
  const onScan = jest.fn();
  const { unmount } = await render(<QrCamera onScan={onScan} />);
  cameraMock.scan({ type: 'qr', data: 'one' });
  await unmount();
  await render(<QrCamera onScan={onScan} />);
  cameraMock.scan({ type: 'qr', data: 'two' });
  expect(onScan.mock.calls).toEqual([['one'], ['two']]);
});

test('draws the four corner brackets', async () => {
  await render(<QrCamera onScan={jest.fn()} />);
  expect(screen.getAllByTestId(/^qr-bracket-/, { includeHiddenElements: true })).toHaveLength(4);
});
