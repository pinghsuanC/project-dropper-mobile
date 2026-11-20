// Server request and response shapes (the server repo's API.md). snake_case, exactly as the
// server's Pydantic models name them: a mismatch is a 422.
import type { FileStatus } from '@/constants/enums';

/** Every successful response: `{ message, data }`. */
export type Envelope<T> = { message: string; data: T };

/** One entry of a 422 `detail` list. */
export type ValidationIssue = { loc: (string | number)[]; msg: string; type: string };

/** An error body's `detail`: text, a 422 list, or null when the body wasn't JSON. */
export type ErrorDetail = string | ValidationIssue[] | null;

export type ChallengeRequest = { device_id: string };
export type ChallengeData = { challenge: string };

export type VerifyChallengeRequest = { device_id: string; challenge: string; signature: string; fingerprint: string };
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

/** `GET /devices/paired`: the paired device (`paired_at` in Unix seconds), or null. */
export type PairedDevice = { device_id: string; name: string; platform: string; paired_at: number };
export type PairedDeviceData = { device: PairedDevice | null };

/**
 * One file of `GET /files/sent`: sent by this phone, not downloaded yet. `pending` = the
 * upload started but was never confirmed. `created_at` in Unix seconds.
 */
export type SentFile = {
  file_id: string;
  file_name: string;
  size: number;
  status: Extract<FileStatus, typeof FileStatus.PENDING | typeof FileStatus.UPLOADED>;
  receiver_name: string;
  created_at: number;
};
/** Newest first; empty when nothing is waiting. */
export type SentFilesData = SentFile[];

/**
 * One file of `POST /files/prepare-batch-upload`. `client_ref` is the phone's own label
 * (unique in the request) that the server echoes back; `checksum` is lowercase hex SHA-256.
 */
export type BatchUploadFile = {
  client_ref: string;
  file_name: string;
  size: number;
  content_type: string;
  checksum: string;
};
export type PrepareBatchUploadRequest = { receiver_id: string; files: BatchUploadFile[] };
/** `upload_url` is a presigned PUT: never logged or shown, and sent without the token. */
export type PreparedUpload = { client_ref: string; file_id: string; upload_url: string };
export type PrepareBatchUploadData = { files: PreparedUpload[] };

export type FinishBatchUploadRequest = { file_ids: string[] };
export type FinishBatchUploadData = { file_ids: string[] };
