// Sending the Upload queue (context/details/1090, Part 2). Runs outside React and reports into
// the session store, so a send carries on when the user leaves /upload. Never throws.
//
// 1. Every queued file turns `waiting`; `uploadSending` = 0 of m ("Preparing…").
// 2. Checksum each file, then one `prepare-batch-upload` for all of them.
// 3. PUT each file to its `upload_url`, one at a time in queue order (n of m, % on the row).
//    A file whose PUT worked leaves the list; one that failed waits, and is queued again at the end.
// 4. One `finish-batch-upload` with the files whose PUT worked.
// Part 2 stopgap for any failure: every file not confirmed goes back to `queued` and the outcome
// is "failed"; Part 3 shows which failed and offers Retry.
import { finishBatchUpload, prepareBatchUpload } from '@/api/files';
import type { BatchUploadFile } from '@/api/types';
import { putFile } from '@/api/upload';
import { DEFAULT_CONTENT_TYPE } from '@/constants/config';
import { fileChecksum } from '@/lib/crypto';
import type { QueuedFile } from '@/lib/uploadQueue';
import { getSession } from '@/state/session';

/** The phone's own label for the i-th file of the batch (echoed back by the server). */
const refOf = (index: number) => `q${index}`;

/** Send every queued file to the paired PC. Does nothing when not paired, empty, or already sending. */
export async function sendQueue(): Promise<void> {
  const session = getSession();
  const receiverId = session.pairedWith?.deviceId;
  const files = session.uploadQueue.filter((file) => file.status === 'queued');
  if (!receiverId || files.length === 0 || session.uploadSending) return;

  const ids = new Set(files.map((file) => file.id));
  session.setUploadOutcome(null);
  session.setUploadQueue((queue) => queue.map((file) => (ids.has(file.id) ? { ...file, status: 'waiting' } : file)));
  session.setUploadSending({ current: 0, total: files.length });

  const confirmed = new Set<string>();
  try {
    const batch: BatchUploadFile[] = [];
    for (const [index, file] of files.entries()) {
      batch.push({
        client_ref: refOf(index),
        file_name: file.name,
        size: file.size,
        content_type: file.mimeType || DEFAULT_CONTENT_TYPE,
        checksum: await fileChecksum(file.uri),
      });
    }

    const prepared = new Map((await prepareBatchUpload(receiverId, batch)).map((upload) => [upload.client_ref, upload]));
    const uploads = files.map((file, index) => {
      const upload = prepared.get(refOf(index));
      if (!upload) throw new Error('A file was not prepared');
      return { file, upload };
    });

    // file id → server file_id, for the files whose PUT worked.
    const put = new Map<string, string>();
    for (const [index, { file, upload }] of uploads.entries()) {
      session.setUploadSending({ current: index + 1, total: files.length });
      session.updateQueuedFile(file.id, { status: 'sending', progress: 0 });
      try {
        await putFile(file.uri, upload.upload_url, (progress) => getSession().updateQueuedFile(file.id, { progress }));
        put.set(file.id, upload.file_id);
        // Sent files leave the list (upload-in-progress.png); a failed finish brings them back.
        session.setUploadQueue((queue) => queue.filter((queued) => queued.id !== file.id));
      } catch {
        // Waits (no ✕ mid-send) and is queued again when the send ends.
        session.updateQueuedFile(file.id, { status: 'waiting', progress: undefined });
      }
    }

    if (put.size > 0) {
      const finished = new Set(await finishBatchUpload([...put.values()]));
      for (const [fileId, serverId] of put) if (finished.has(serverId)) confirmed.add(fileId);
    }
  } catch {
    // Anything else (checksum, prepare, finish, offline): nothing more is confirmed.
  } finally {
    restoreUnconfirmed(files, confirmed);
    session.setUploadSending(null);
    session.setUploadOutcome(confirmed.size === files.length ? { kind: 'sent', count: files.length } : { kind: 'failed' });
  }
}

/**
 * Every file of this send that wasn't confirmed is `queued` again, in its first order, at the
 * front of the queue; files that weren't part of it (added meanwhile, older ones) follow.
 */
function restoreUnconfirmed(files: QueuedFile[], confirmed: Set<string>) {
  const ids = new Set(files.map((file) => file.id));
  const back = files.filter((file) => !confirmed.has(file.id)).map((file) => ({ ...file, status: 'queued' as const, progress: undefined }));
  getSession().setUploadQueue((queue) => [...back, ...queue.filter((file) => !ids.has(file.id))]);
}
