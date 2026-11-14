// Auth routes (the server repo's API.md). All three are unauthenticated.
import { request } from '@/api/client';
import type {
  ChallengeData,
  ChallengeRequest,
  RegisterData,
  RegisterRequest,
  VerifyChallengeData,
  VerifyChallengeRequest,
} from '@/api/types';
import { API_PATHS, DEVICE_PLATFORM } from '@/constants/config';

/** `POST /auth/challenge`. 404 = the server forgot this device (re-register once). */
export async function requestChallenge(deviceId: string): Promise<string> {
  const body: ChallengeRequest = { device_id: deviceId };
  const data = await request<ChallengeData>(API_PATHS.challenge, { method: 'POST', body });
  return data.challenge;
}

/** `POST /auth/verify-challenge`. Returns the session token: keep it in memory only. */
export async function verifyChallenge(deviceId: string, challenge: string, signature: string): Promise<string> {
  const body: VerifyChallengeRequest = { device_id: deviceId, challenge, signature };
  const data = await request<VerifyChallengeData>(API_PATHS.verifyChallenge, { method: 'POST', body });
  return data.token;
}

export type RegisterInput = { name: string; publicKey: string; fingerprint: string };

/** `POST /auth/register`. Returns the new device_id. */
export async function registerDevice({ name, publicKey, fingerprint }: RegisterInput): Promise<string> {
  const body: RegisterRequest = {
    name,
    platform: DEVICE_PLATFORM,
    public_key: publicKey,
    fingerprint,
  };
  const data = await request<RegisterData>(API_PATHS.register, { method: 'POST', body });
  return data.device_id;
}
