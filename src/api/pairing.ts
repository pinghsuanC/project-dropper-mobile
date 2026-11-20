// Pairing routes (the server repo's API.md).
import { request } from '@/api/client';
import type { PairedWith, PairingClaimData, PairingClaimRequest } from '@/api/types';
import { API_PATHS } from '@/constants/config';

/**
 * `POST /pairing-request/claim` (protected): claim the code from the PC's QR, which pairs this
 * phone with that PC. Returns the PC. Errors: 404 invalid / expired / used code, 409 this phone
 * or that PC is already paired, plus 401 · 403 · 422.
 */
export async function claimPairing(pairingToken: string): Promise<PairedWith> {
  const body: PairingClaimRequest = { pairing_token: pairingToken };
  const data = await request<PairingClaimData>(API_PATHS.claimPairing, { method: 'POST', body, auth: true });
  return data.paired_with;
}
