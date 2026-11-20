import { renderHook } from '@testing-library/react-native';

import { useQrScan } from './useQrScan';

async function setup() {
  const onScan = jest.fn();
  const { result } = await renderHook(() => useQrScan(onScan));
  return { onScan, scan: result.current };
}

test('a QR result calls onScan with its text', async () => {
  const { onScan, scan } = await setup();
  scan({ type: 'qr', data: 'hello' });
  expect(onScan).toHaveBeenCalledWith('hello');
});

test('only the first code counts: the camera fires many times a second', async () => {
  const { onScan, scan } = await setup();
  scan({ type: 'qr', data: 'first' });
  scan({ type: 'qr', data: 'first' });
  scan({ type: 'qr', data: 'second' });
  expect(onScan).toHaveBeenCalledTimes(1);
  expect(onScan).toHaveBeenCalledWith('first');
});

test('other barcode types are ignored', async () => {
  const { onScan, scan } = await setup();
  scan({ type: 'ean13', data: '4006381333931' });
  expect(onScan).not.toHaveBeenCalled();
});

test('an empty code is ignored, and the next real one still counts', async () => {
  const { onScan, scan } = await setup();
  scan({ type: 'qr', data: '' });
  expect(onScan).not.toHaveBeenCalled();
  scan({ type: 'qr', data: 'real' });
  expect(onScan).toHaveBeenCalledWith('real');
});
