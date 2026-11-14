import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Relative: jest-expo maps every `@/…` to src/, so `@/assets/…` doesn't resolve in Jest.
import quotes from '../../assets/quotes.json';
import { getSession, useSession, useSessionStore } from '@/state/session';

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
    getSession().setPairedWith({ pcName: 'DESKTOP-01' });
    expect(getSession().pairedWith).toEqual({ pcName: 'DESKTOP-01' });
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
    session.setPairedWith({ pcName: 'PC' });
    session.setQuote('Q');
    getSession().reset();
    const after = getSession();
    expect(after.deviceId).toBeNull();
    expect(after.userName).toBeNull();
    expect(after.deviceName).toBeNull();
    expect(after.token).toBeNull();
    expect(after.pairedWith).toBeNull();
    expect(after.quote).toEqual({ text: quotes[0].text });
  });

  test('is memory only: no persist middleware', () => {
    expect((useSessionStore as unknown as { persist?: unknown }).persist).toBeUndefined();
  });
});

describe('useSession', () => {
  test('reads the same values as getSession', async () => {
    getSession().setPairedWith({ pcName: 'DESKTOP-01' });
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

    await act(async () => getSession().setPairedWith({ pcName: 'PC' }));
    expect(renders).toBe(afterMount + 1);
    expect(getByText('PC')).toBeTruthy();
  });
});
