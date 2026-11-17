import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Relative: jest-expo maps every `@/…` to src/, so `@/assets/…` doesn't resolve in Jest.
import quotes from '../../assets/quotes.json';
import type { QueuedFile } from '@/lib/uploadQueue';
import { getSession, useSession, useSessionStore } from '@/state/session';

const FILE: QueuedFile = { id: 'file:///a.txt', uri: 'file:///a.txt', name: 'a.txt', size: 3, status: 'queued' };
const OTHER: QueuedFile = { id: 'file:///b.txt', uri: 'file:///b.txt', name: 'b.txt', size: 4, status: 'queued' };

// No component is mounted between tests, so no act() is needed here.
beforeEach(() => {
  getSession().reset();
});

describe('default quotes', () => {
  test('assets/quotes.json is a non-empty list of quotes with text', () => {
    expect(Array.isArray(quotes)).toBe(true);
    expect(quotes.length).toBeGreaterThan(0);
    for (const quote of quotes) {
      expect(typeof quote.text).toBe('string');
      expect(quote.text.trim()).not.toBe('');
    }
  });
});

describe('session store', () => {
  test('starts empty, with the first default quote', () => {
    const session = getSession();
    expect(session.deviceId).toBeNull();
    expect(session.userName).toBeNull();
    expect(session.deviceName).toBeNull();
    expect(session.token).toBeNull();
    expect(session.pairedWith).toBeNull();
    expect(session.quote).toEqual({ text: quotes[0].text });
    expect(session.uploadQueue).toEqual([]);
    expect(session.uploadSending).toBeNull();
    expect(session.uploadOutcome).toBeNull();
  });

  test('setIdentity sets only the device and names', () => {
    getSession().setIdentity({ deviceId: 'dev-1', userName: 'friend', deviceName: 'My phone' });
    const session = getSession();
    expect(session.deviceId).toBe('dev-1');
    expect(session.userName).toBe('friend');
    expect(session.deviceName).toBe('My phone');
    expect(session.token).toBeNull();
    expect(session.pairedWith).toBeNull();
  });

  test('setIdentity accepts missing names', () => {
    getSession().setIdentity({ deviceId: 'dev-1', userName: null, deviceName: null });
    expect(getSession().deviceId).toBe('dev-1');
    expect(getSession().userName).toBeNull();
    expect(getSession().deviceName).toBeNull();
  });

  test('setToken sets only the token, and can clear it', () => {
    getSession().setToken('tok');
    expect(getSession().token).toBe('tok');
    expect(getSession().deviceId).toBeNull();
    getSession().setToken(null);
    expect(getSession().token).toBeNull();
  });

  test('setPairedWith sets and clears the paired PC', () => {
    getSession().setPairedWith({ pcName: 'DESKTOP-01', deviceId: 'pc-1' });
    expect(getSession().pairedWith).toEqual({ pcName: 'DESKTOP-01', deviceId: 'pc-1' });
    getSession().setPairedWith(null);
    expect(getSession().pairedWith).toBeNull();
  });

  test('setQuote replaces the quote text', () => {
    getSession().setQuote('Hello');
    expect(getSession().quote).toEqual({ text: 'Hello' });
  });

  test('reset returns to the start state', () => {
    const session = getSession();
    session.setIdentity({ deviceId: 'd', userName: 'u', deviceName: 'n' });
    session.setToken('tok');
    session.setPairedWith({ pcName: 'PC', deviceId: 'pc-1' });
    session.setQuote('Q');
    session.setUploadQueue([FILE]);
    session.setUploadSending({ run: 1, current: 1, total: 1 });
    session.setUploadOutcome({ kind: 'sent', count: 1 });
    getSession().reset();
    const after = getSession();
    expect(after.deviceId).toBeNull();
    expect(after.userName).toBeNull();
    expect(after.deviceName).toBeNull();
    expect(after.token).toBeNull();
    expect(after.pairedWith).toBeNull();
    expect(after.quote).toEqual({ text: quotes[0].text });
    expect(after.uploadQueue).toEqual([]);
    expect(after.uploadSending).toBeNull();
    expect(after.uploadOutcome).toBeNull();
  });

  test('is memory only: no persist middleware', () => {
    expect((useSessionStore as unknown as { persist?: unknown }).persist).toBeUndefined();
  });
});

describe('upload slice (1090: the queue outlives the Upload screen)', () => {
  test('setUploadQueue replaces the queue', () => {
    getSession().setUploadQueue([FILE]);
    expect(getSession().uploadQueue).toEqual([FILE]);
  });

  test('setUploadQueue also takes an update from the current queue', () => {
    getSession().setUploadQueue([FILE]);
    getSession().setUploadQueue((queue) => [...queue, OTHER]);
    expect(getSession().uploadQueue).toEqual([FILE, OTHER]);
  });

  test('updateQueuedFile changes only that file', () => {
    getSession().setUploadQueue([FILE, OTHER]);
    getSession().updateQueuedFile(FILE.id, { status: 'sending', progress: 0.5 });
    expect(getSession().uploadQueue).toEqual([{ ...FILE, status: 'sending', progress: 0.5 }, OTHER]);
  });

  test('setUploadSending sets and clears the running count', () => {
    getSession().setUploadSending({ run: 7, current: 2, total: 3 });
    expect(getSession().uploadSending).toEqual({ run: 7, current: 2, total: 3 });
    getSession().setUploadSending(null);
    expect(getSession().uploadSending).toBeNull();
  });

  test('setUploadOutcome sets and clears the last result', () => {
    getSession().setUploadOutcome({ kind: 'partial', sent: 2, total: 3 });
    expect(getSession().uploadOutcome).toEqual({ kind: 'partial', sent: 2, total: 3 });
    getSession().setUploadOutcome(null);
    expect(getSession().uploadOutcome).toBeNull();
  });
});

describe('useSession', () => {
  test('reads the same values as getSession', async () => {
    getSession().setPairedWith({ pcName: 'DESKTOP-01', deviceId: 'pc-1' });
    function Probe() {
      const pc = useSession((s) => s.pairedWith);
      return <Text>{pc?.pcName ?? 'none'}</Text>;
    }
    const { getByText } = await render(<Probe />);
    expect(getByText('DESKTOP-01')).toBeTruthy();
  });

  test('re-renders only when the selected slice changes', async () => {
    let renders = 0;
    function Probe() {
      renders += 1;
      const pc = useSession((s) => s.pairedWith);
      return <Text>{pc?.pcName ?? 'none'}</Text>;
    }
    const { getByText } = await render(<Probe />);
    const afterMount = renders;

    await act(async () => getSession().setToken('tok'));
    expect(renders).toBe(afterMount);

    await act(async () => getSession().setPairedWith({ pcName: 'PC', deviceId: 'pc-1' }));
    expect(renders).toBe(afterMount + 1);
    expect(getByText('PC')).toBeTruthy();
  });
});
