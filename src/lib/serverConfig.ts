// The server config (context/details/1100): the Cloudflare Access service token from the PC's
// server-config QR code. Checked with GET /health before it is kept; once kept, it lives in
// secure storage and in api/apiHeaders.ts's memory.
import { setCloudflareAccess } from '@/api/apiHeaders';
import { checkHealth, CloudflareRefusedError } from '@/api/client';
import type { ServerConfig } from '@/lib/serverConfigQr';
import { clearCloudflareAccess, saveCloudflareAccess } from '@/lib/storage';

/**
 * How checking a scanned config went: kept, refused by Cloudflare, no working server, or the
 * server was fine but secure storage couldn't keep the values.
 */
export type ServerConfigResult = 'ok' | 'refused' | 'unreachable' | 'saveFailed';

/**
 * Set by the server-config screen once its values work, for the rest of this launch (memory
 * only). Start-up then stops sending a phone with no device_id back to that screen: it goes on
 * to Register.
 */
let doneThisLaunch = false;

export function isServerConfigDone(): boolean {
  return doneThisLaunch;
}

export function markServerConfigDone(): void {
  doneThisLaunch = true;
}

/** For tests: a fresh launch. */
export function resetServerConfigDone(): void {
  doneThisLaunch = false;
}

/**
 * Try a scanned config with GET /health and keep it only if the server answers: save (or, for
 * "no tunnel", clear) the values, hand them to the API client and mark the config done. A
 * failed check changes nothing, so a bad scan never replaces values that work. Never throws.
 */
export async function applyServerConfig(config: ServerConfig): Promise<ServerConfigResult> {
  const access = config.kind === 'tunnel' ? config.access : null;
  try {
    await checkHealth(access);
  } catch (error) {
    return error instanceof CloudflareRefusedError ? 'refused' : 'unreachable';
  }

  try {
    if (access) await saveCloudflareAccess(access);
    else await clearCloudflareAccess();
  } catch {
    return 'saveFailed';
  }
  setCloudflareAccess(access);
  markServerConfigDone();
  return 'ok';
}
