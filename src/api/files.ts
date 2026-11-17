// Files routes (the server repo's API.md).
import { request } from '@/api/client';
import type {
  BatchUploadFile,
  FinishBatchUploadData,
  FinishBatchUploadRequest,
  PrepareBatchUploadData,
  PrepareBatchUploadRequest,
  PreparedUpload,
  SentFilesData,
} from '@/api/types';
import { API_PATHS } from '@/constants/config';

/**
 * `GET /files/sent` (protected): the files this phone sent that the PC hasn't downloaded yet,
 * newest first. The sender is the session's device; the request names no one.
 */
export async function getSentFiles(): Promise<SentFilesData> {
  return request<SentFilesData>(API_PATHS.sentFiles, { auth: true });
}

/**
 * `POST /files/prepare-batch-upload` (protected) → 201: one upload per file to the receiver,
 * each with its presigned `upload_url` (never logged). Returned in request order; match by
 * `client_ref`.
 */
export async function prepareBatchUpload(receiverId: string, files: BatchUploadFile[]): Promise<PreparedUpload[]> {
  const body: PrepareBatchUploadRequest = { receiver_id: receiverId, files };
  const data = await request<PrepareBatchUploadData>(API_PATHS.prepareBatchUpload, { method: 'POST', body, auth: true });
  return data.files;
}

/**
 * `POST /files/finish-batch-upload` (protected): confirms the uploads. Strict on the server:
 * one bad file (404 / 409) and none is marked.
 */
export async function finishBatchUpload(fileIds: string[]): Promise<string[]> {
  const body: FinishBatchUploadRequest = { file_ids: fileIds };
  const data = await request<FinishBatchUploadData>(API_PATHS.finishBatchUpload, { method: 'POST', body, auth: true });
  return data.file_ids;
}
