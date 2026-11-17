import { renderHook } from '@testing-library/react-native';

import { printQrCode, useQrScan } from './useQrScan';

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

test('printQrCode prints the text in dev builds', () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  printQrCode('pair-me');
  expect(log).toHaveBeenCalledWith(expect.any(String), 'pair-me');
  log.mockRestore();
});

test('printQrCode prints nothing in release builds', () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  const g = globalThis as unknown as { __DEV__: boolean };
  const dev = g.__DEV__;
  g.__DEV__ = false;
  try {
    printQrCode('pair-me');
    expect(log).not.toHaveBeenCalled();
  } finally {
    g.__DEV__ = dev;
    log.mockRestore();
  }
});
