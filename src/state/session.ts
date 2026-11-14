// The session: in-memory app state every screen reads (context/details/1010, 1030).
// One global Zustand store, no Provider. Nothing here is persisted: the token in
// particular is never written to storage or logged.
import { create } from 'zustand';

// Relative: jest-expo maps every `@/…` to src/, so `@/assets/…` doesn't resolve in Jest.
import defaultQuotes from '../../assets/quotes.json';

export type Quote = { text: string };
export type PairedPc = { pcName: string };
export type Identity = { deviceId: string; userName: string; deviceName: string };

type SessionState = {
  deviceId: string | null;
  userName: string | null;
  deviceName: string | null;
  /** Memory only. Read it with getSession() outside React (e.g. api/client.ts). */
  token: string | null;
  /** null = not paired. */
  pairedWith: PairedPc | null;
  quote: Quote;
};

type SessionActions = {
  setIdentity: (identity: Identity) => void;
  setToken: (token: string | null) => void;
  setPairedWith: (pc: PairedPc | null) => void;
  setQuote: (text: string) => void;
  reset: () => void;
};

export type Session = SessionState & SessionActions;

const initialState = (): SessionState => ({
  deviceId: null,
  userName: null,
  deviceName: null,
  token: null,
  pairedWith: null,
  quote: { text: defaultQuotes[0].text },
});

export const useSessionStore = create<Session>()((set) => ({
  ...initialState(),
  setIdentity: ({ deviceId, userName, deviceName }) => set({ deviceId, userName, deviceName }),
  setToken: (token) => set({ token }),
  setPairedWith: (pairedWith) => set({ pairedWith }),
  setQuote: (text) => set({ quote: { text } }),
  reset: () => set(initialState()),
}));

/** Read one slice of the session; the component re-renders only when that slice changes. */
export function useSession<T>(selector: (session: Session) => T): T {
  return useSessionStore(selector);
}

/** Read the session outside React. */
export function getSession(): Session {
  return useSessionStore.getState();
}
