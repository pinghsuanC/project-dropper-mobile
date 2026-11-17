// Files routes (the server repo's API.md).
import { request } from '@/api/client';
import type { SentFilesData } from '@/api/types';
import { API_PATHS } from '@/constants/config';

/**
 * `GET /files/sent` (protected): the files this phone sent that the PC hasn't downloaded yet,
 * newest first. The sender is the session's device; the request names no one.
 */
export async function getSentFiles(): Promise<SentFilesData> {
  return request<SentFilesData>(API_PATHS.sentFiles, { auth: true });
}
