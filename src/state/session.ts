// The session: in-memory app state every screen reads (context/details/1010, 1030).
// One global Zustand store, no Provider. Nothing here is persisted: the token in
// particular is never written to storage or logged.
import { create } from 'zustand';

import type { QueuedFile } from '@/lib/uploadQueue';

// Relative: jest-expo maps every `@/…` to src/, so `@/assets/…` doesn't resolve in Jest.
import defaultQuotes from '../../assets/quotes.json';

export type Quote = { text: string };
/** The paired PC: its name for Home, its `device_id` as the upload's `receiver_id`. */
export type PairedPc = { pcName: string; deviceId: string };
/**
 * A running upload: `run` tells this send apart from any other (a reset or a new send replaces
 * it); `current` = the file being sent (1…total), 0 while preparing.
 */
export type UploadSending = { run: number; current: number; total: number };
/** How the last upload ended, until its popup is closed: all sent, or `sent` of `total`. */
export type UploadOutcome = { kind: 'sent'; count: number } | { kind: 'partial'; sent: number; total: number };
/** Names can be missing: the user name is local only and optional (1010). */
export type Identity = { deviceId: string; userName: string | null; deviceName: string | null };

type SessionState = {
  deviceId: string | null;
  userName: string | null;
  deviceName: string | null;
  /** Memory only. Read it with getSession() outside React (e.g. api/client.ts). */
  token: string | null;
  /** null = not paired. */
  pairedWith: PairedPc | null;
  quote: Quote;
  /** The Upload queue (1090): kept here so it outlives the screen; not across restarts. */
  uploadQueue: QueuedFile[];
  uploadSending: UploadSending | null;
  uploadOutcome: UploadOutcome | null;
};

type SessionActions = {
  setIdentity: (identity: Identity) => void;
  setToken: (token: string | null) => void;
  setPairedWith: (pc: PairedPc | null) => void;
  setQuote: (text: string) => void;
  setUploadQueue: (next: QueuedFile[] | ((queue: QueuedFile[]) => QueuedFile[])) => void;
  updateQueuedFile: (id: string, change: Partial<Omit<QueuedFile, 'id'>>) => void;
  setUploadSending: (sending: UploadSending | null) => void;
  setUploadOutcome: (outcome: UploadOutcome | null) => void;
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
  uploadQueue: [],
  uploadSending: null,
  uploadOutcome: null,
});

export const useSessionStore = create<Session>()((set) => ({
  ...initialState(),
  setIdentity: ({ deviceId, userName, deviceName }) => set({ deviceId, userName, deviceName }),
  setToken: (token) => set({ token }),
  setPairedWith: (pairedWith) => set({ pairedWith }),
  setQuote: (text) => set({ quote: { text } }),
  setUploadQueue: (next) => set((s) => ({ uploadQueue: typeof next === 'function' ? next(s.uploadQueue) : next })),
  updateQueuedFile: (id, change) =>
    set((s) => ({ uploadQueue: s.uploadQueue.map((file) => (file.id === id ? { ...file, ...change } : file)) })),
  setUploadSending: (uploadSending) => set({ uploadSending }),
  setUploadOutcome: (uploadOutcome) => set({ uploadOutcome }),
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
