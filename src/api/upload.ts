// The PUT of a file's bytes to its presigned `upload_url` (1090). R2, not the API server, so it
// skips api/client.ts: no envelope, and never the Authorization header (CLAUDE.md). The url is
// a secret for ~10 minutes: it is never logged and never put in an error.
import { File, UploadType } from 'expo-file-system';

import { UPLOAD_STALL_TIMEOUT_MS } from '@/constants/config';

/** The PUT failed: `status` is R2's answer, or null when there was none (offline, stalled, cancelled). */
export class UploadError extends Error {
  constructor(readonly status: number | null) {
    super(status === null ? 'Upload failed' : `Upload returned ${status}`);
    this.name = 'UploadError';
  }
}

/**
 * Upload the file at `uri` to `url` as the raw request body. `onProgress` gets 0–1, never lower
 * than it already gave: the native side counts each attempt at the body from 0, so a retried
 * connection would show 12% → 1% (seen on the phone, 1090). Throws
 * `UploadError` on a non-2xx answer (expo-file-system resolves on any status) or no answer.
 */
export async function putFile(uri: string, url: string, onProgress: (fraction: number) => void): Promise<void> {
  // Cancel a stalled upload: no progress for UPLOAD_STALL_TIMEOUT_MS. Each report restarts the
  // wait, so a slow but moving upload of a large file is never cut.
  const controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), UPLOAD_STALL_TIMEOUT_MS);
  const stillMoving = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), UPLOAD_STALL_TIMEOUT_MS);
  };

  let highest = -1;

  let status: number;
  try {
    const result = await new File(uri).upload(url, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      signal: controller.signal,
      onProgress: ({ bytesSent, totalBytes }) => {
        // Bytes are moving even on a retried attempt, so it still restarts the stall wait.
        stillMoving();
        const fraction = totalBytes > 0 ? bytesSent / totalBytes : 0;
        if (fraction <= highest) return;
        highest = fraction;
        onProgress(fraction);
      },
    });
    status = result.status;
  } catch {
    // Cancelled, offline, or any native error (which may name the url: drop it).
    throw new UploadError(null);
  } finally {
    clearTimeout(timer);
  }
  if (status < 200 || status >= 300) throw new UploadError(status);
}
