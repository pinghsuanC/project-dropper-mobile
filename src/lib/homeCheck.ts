// Home's connection check (context/details/1060): `GET /auth/me` confirms the session and that
// the server answers, then the paired device decides the look. Returns a result; never throws.
import { getMe } from '@/api/auth';
import { getPairedDevice } from '@/api/devices';
import { getSession } from '@/state/session';

export type ConnectionResult = 'paired' | 'unpaired' | 'serverError';

/** Run the check once. Retry calls it again. */
export async function checkConnection(): Promise<ConnectionResult> {
  try {
    await getMe();
    const pc = await getPairedDevice();
    getSession().setPairedWith(pc ? { pcName: pc.name } : null);
    return pc ? 'paired' : 'unpaired';
  } catch {
    // Unreachable, 5xx, or a 401 / 403 on /auth/me: all show "Can't reach" with Retry for now.
    return 'serverError';
  }
}
