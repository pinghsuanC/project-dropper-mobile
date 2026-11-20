// The connection check of Home (1060, its look) and of Upload (1090) and Server status (1070),
// their status bars: `checkConnection()` once when the screen opens, with "Checking…" held for MIN_CHECKING_MS so
// a fast answer doesn't flash by. A testing-menu look skips it and shows Connected.
import { useCallback, useEffect, useState } from 'react';

import type { StatusSegment } from '@/components/ui';
import { MIN_CHECKING_MS } from '@/constants/config';
import { strings } from '@/constants/strings';
import { checkConnection, type ConnectionResult } from '@/lib/homeCheck';
import { atLeast } from '@/lib/wait';
import { useSession } from '@/state/session';

export type Connection = 'checking' | ConnectionResult;

const c = strings.connection;
const TEXT: Record<Connection, string> = {
  checking: c.checking,
  paired: c.connected,
  unpaired: c.notConnected,
  serverError: c.serverError,
};

/**
 * Check once on mount (unless `skip`); `recheck` shows "Checking…" and checks again. A result
 * that comes after the screen has closed is dropped. "Not paired" turns into "paired" once the
 * session has a paired PC: Pairing step 2 sets it, and Home is still open under it (1080).
 */
export function useConnection(skip: boolean): { connection: Connection; recheck: () => Promise<void> } {
  const [connection, setConnection] = useState<Connection>(skip ? 'paired' : 'checking');

  useEffect(() => {
    if (skip) return;
    let current = true;
    void atLeast(checkConnection(), MIN_CHECKING_MS).then((result) => {
      if (current) setConnection(result);
    });
    return () => {
      current = false;
    };
  }, [skip]);

  const recheck = useCallback(async () => {
    setConnection('checking');
    setConnection(await atLeast(checkConnection(), MIN_CHECKING_MS));
  }, []);

  const pairedSince = useSession((s) => s.pairedWith !== null);
  return { connection: connection === 'unpaired' && pairedSince ? 'paired' : connection, recheck };
}

/** The status bar's connection segment: its text, and the green dot when connected. */
export function connectionSegment(connection: Connection): StatusSegment {
  return { text: TEXT[connection], dot: connection === 'paired' };
}
