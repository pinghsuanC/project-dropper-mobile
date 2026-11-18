// Sending the Upload queue (context/details/1090). Runs outside React and reports into the
// session store, so a send carries on when the user leaves /upload. Never throws.
//
// 1. The files to send turn `waiting`; `uploadSending` = 0 of m ("Preparing…").
// 2. Checksum each file, then one `prepare-batch-upload` for all of them. "Preparing…" stays
//    at least MIN_PREPARING_MS, so it doesn't flash by on a fast network.
// 3. PUT each file to its `upload_url`, one at a time in queue order (n of m, % on the row).
//    A file whose PUT worked leaves the list; one that failed waits until the send ends.
// 4. One `finish-batch-upload` with the files whose PUT worked (strict: all or none).
// 5. Every file not confirmed ends `failed`; the outcome is "all sent" or "sent of total".
//
// Upload sends the `queued` files; Retry failed sends the `failed` ones as a new send. Each send
// has a run id in `uploadSending`: once a reset (or anything else) replaces it, this send stops
// and writes nothing more into the store.
import { finishBatchUpload, prepareBatchUpload } from '@/api/files';
import type { BatchUploadFile } from '@/api/types';
import { putFile } from '@/api/upload';
import { DEFAULT_CONTENT_TYPE, MIN_PREPARING_MS } from '@/constants/config';
import { fileChecksum } from '@/lib/crypto';
import type { QueuedFile } from '@/lib/uploadQueue';
import { atLeast } from '@/lib/wait';
import { getSession } from '@/state/session';

/** The phone's own label for the i-th file of the batch (echoed back by the server). */
const refOf = (index: number) => `q${index}`;

/** Thrown inside a send whose run was replaced: stop without touching the store. */
class Replaced extends Error {}

let lastRun = 0;

/**
 * Send the `queued` files (Upload), or the `failed` ones (Retry failed), to the paired PC.
 * Does nothing when not paired, when there is no such file, or while a send is running.
 */
export async function sendQueue(which: 'queued' | 'failed' = 'queued'): Promise<void> {
  const session = getSession();
  const receiverId = session.pairedWith?.deviceId;
  const files = session.uploadQueue.filter((file) => file.status === which);
  if (!receiverId || files.length === 0 || session.uploadSending) return;

  const run = ++lastRun;
  const total = files.length;
  /** Throws `Replaced` once this send is no longer the running one. */
  const stillMine = () => {
    if (getSession().uploadSending?.run !== run) throw new Replaced();
  };

  const ids = new Set(files.map((file) => file.id));
  session.setUploadOutcome(null);
  session.setUploadQueue((queue) =>
    queue.map((file) => (ids.has(file.id) ? { ...file, status: 'waiting', progress: undefined } : file)),
  );
  session.setUploadSending({ run, current: 0, total });

  const confirmed = new Set<string>();
  try {
    try {
      const prepare = async () => {
        const batch: BatchUploadFile[] = [];
        for (const [index, file] of files.entries()) {
          const checksum = await fileChecksum(file.uri);
          stillMine();
          batch.push({
            client_ref: refOf(index),
            file_name: file.name,
            size: file.size,
            content_type: file.mimeType || DEFAULT_CONTENT_TYPE,
            checksum,
          });
        }
        return prepareBatchUpload(receiverId, batch);
      };

      const prepared = new Map((await atLeast(prepare(), MIN_PREPARING_MS)).map((upload) => [upload.client_ref, upload]));
      stillMine();
      const uploads = files.map((file, index) => {
        const upload = prepared.get(refOf(index));
        if (!upload) throw new Error('A file was not prepared');
        return { file, upload };
      });

      // file id → server file_id, for the files whose PUT worked.
      const put = new Map<string, string>();
      for (const [index, { file, upload }] of uploads.entries()) {
        session.setUploadSending({ run, current: index + 1, total });
        session.updateQueuedFile(file.id, { status: 'sending', progress: 0 });
        try {
          await putFile(file.uri, upload.upload_url, (progress) => {
            if (getSession().uploadSending?.run === run) getSession().updateQueuedFile(file.id, { progress });
          });
          stillMine();
          put.set(file.id, upload.file_id);
          // Sent files leave the list (upload-in-progress.png); a failed finish brings them back.
          session.setUploadQueue((queue) => queue.filter((queued) => queued.id !== file.id));
        } catch {
          stillMine();
          // Waits (no ✕ mid-send) and ends Failed when the send ends.
          session.updateQueuedFile(file.id, { status: 'waiting', progress: undefined });
        }
      }

      if (put.size > 0) {
        const finished = new Set(await finishBatchUpload([...put.values()]));
        stillMine();
        for (const [fileId, serverId] of put) if (finished.has(serverId)) confirmed.add(fileId);
      }
    } catch {
      // Anything else (checksum, prepare, finish, offline): nothing more is confirmed, unless
      // the send was replaced, which stillMine() passes on.
      stillMine();
    }
    finish(files, confirmed);
  } catch {
    // Replaced: the store belongs to a reset or a newer send now.
  }
}

/**
 * Every file of the send that wasn't confirmed ends `failed`, in its first order, at the front
 * of the queue; files that weren't part of it (added meanwhile) follow. Then the outcome.
 */
function finish(files: QueuedFile[], confirmed: Set<string>) {
  const session = getSession();
  const ids = new Set(files.map((file) => file.id));
  const failed = files
    .filter((file) => !confirmed.has(file.id))
    .map((file) => ({ ...file, status: 'failed' as const, progress: undefined }));
  session.setUploadQueue((queue) => [...failed, ...queue.filter((file) => !ids.has(file.id))]);
  session.setUploadSending(null);
  session.setUploadOutcome(
    failed.length === 0 ? { kind: 'sent', count: files.length } : { kind: 'partial', sent: confirmed.size, total: files.length },
  );
}
