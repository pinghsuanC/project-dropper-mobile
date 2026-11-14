// Server request and response shapes (the server repo's API.md). snake_case, exactly as the
// server's Pydantic models name them: a mismatch is a 422.

/** Every successful response: `{ message, data }`. */
export type Envelope<T> = { message: string; data: T };

/** One entry of a 422 `detail` list. */
export type ValidationIssue = { loc: (string | number)[]; msg: string; type: string };

/** An error body's `detail`: text, a 422 list, or null when the body wasn't JSON. */
export type ErrorDetail = string | ValidationIssue[] | null;

export type ChallengeRequest = { device_id: string };
export type ChallengeData = { challenge: string };

export type VerifyChallengeRequest = { device_id: string; challenge: string; signature: string };
export type VerifyChallengeData = { token: string };

export type RegisterRequest = {
  name: string;
  platform: 'android';
  public_key: string;
  fingerprint: string;
};
export type RegisterData = { device_id: string };

/** `GET /auth/me`. (`welcome_gif` is 🚧 on the server and not read yet.) */
export type MeData = { device_id: string; name: string; platform: string };
