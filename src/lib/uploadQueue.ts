// The Upload queue's rules (context/details/1090), as pure functions. The queue itself lives in
// the session store (1030); the screen and lib/sendQueue call these.
import { MAX_UPLOAD_BYTES } from '@/constants/config';
import { strings } from '@/constants/strings';
import { formatSize } from '@/lib/format';
import { matchesName } from '@/lib/search';
import type { UploadOutcome } from '@/state/session';

/** queued: waiting for Upload · waiting: in a running upload, not started · sending · failed. */
export type QueueStatus = 'queued' | 'waiting' | 'sending' | 'failed';

export type QueuedFile = {
  /**
   * The picker's content:// link is the id. Picking the same document again gives the same link,
   * but it is skipped as the same name and size, so ids stay unique in the queue.
   */
  id: string;
  uri: string;
  name: string;
  size: number;
  mimeType?: string;
  status: QueueStatus;
  /** 0–1, while sending. */
  progress?: number;
};

/** What the picker gives for one file (expo-document-picker's asset). */
export type PickedFile = { name: string; uri: string; size?: number; mimeType?: string };

export type AddResult = {
  queue: QueuedFile[];
  /** Over MAX_UPLOAD_BYTES: never added. */
  tooLarge: PickedFile[];
  /** The picker gave no size: never added (it can't be checked). */
  unknownSize: PickedFile[];
};

/** Same name and size: taken as the same file picked again. */
const sameFile = (a: { name: string; size?: number }, b: { name: string; size?: number }) =>
  a.name === b.name && a.size === b.size;

/**
 * Adds picked files to the end of the queue, in pick order. Files over the limit or without a
 * size are left out and reported; a file already queued (or twice in this pick) is skipped.
 */
export function addPicked(queue: QueuedFile[], picked: PickedFile[]): AddResult {
  const next = [...queue];
  const tooLarge: PickedFile[] = [];
  const unknownSize: PickedFile[] = [];
  for (const file of picked) {
    if (file.size === undefined) unknownSize.push(file);
    else if (file.size > MAX_UPLOAD_BYTES) tooLarge.push(file);
    else if (!next.some((queued) => sameFile(queued, file))) {
      next.push({ id: file.uri, uri: file.uri, name: file.name, size: file.size, mimeType: file.mimeType, status: 'queued' });
    }
  }
  return { queue: next, tooLarge, unknownSize };
}

export function removeFile(queue: QueuedFile[], id: string): QueuedFile[] {
  return queue.filter((file) => file.id !== id);
}

/** The files whose name matches the search. */
export function filterQueue(queue: QueuedFile[], query: string): QueuedFile[] {
  return queue.filter((file) => matchesName(file.name, query));
}

/** A popup on the Upload screen: an error, or the info "Upload complete". */
export type UploadPopup = { kind: 'error' | 'info'; title?: string; heading?: string; message: string };

const u = strings.upload;

/** The error popup for files a pick left out, or null when every file was added. */
export function pickProblem({ tooLarge, unknownSize }: Pick<AddResult, 'tooLarge' | 'unknownSize'>): UploadPopup | null {
  const max = formatSize(MAX_UPLOAD_BYTES);
  if (tooLarge.length === 1) {
    const [file] = tooLarge;
    return { kind: 'error', message: u.tooLargeOne(file.name, formatSize(file.size ?? 0), max) };
  }
  if (tooLarge.length > 1) return { kind: 'error', message: u.tooLargeMany(tooLarge.length, max) };
  if (unknownSize.length === 1) return { kind: 'error', message: u.unknownSizeOne(unknownSize[0].name) };
  if (unknownSize.length > 1) return { kind: 'error', message: u.unknownSizeMany(unknownSize.length) };
  return null;
}

/** Leaving /upload drops failed files (the Back note); queued, waiting and sending ones stay. */
export function dropFailed(queue: QueuedFile[]): QueuedFile[] {
  return queue.filter((file) => file.status !== 'failed');
}

/** The popup for how the last send ended: "N files sent to your PC." or "2 of 3 sent. Please retry." */
export function outcomePopup(outcome: UploadOutcome): UploadPopup {
  return outcome.kind === 'sent'
    ? { kind: 'info', title: u.popupTitle, heading: u.complete, message: u.sent(outcome.count) }
    : { kind: 'error', title: u.popupTitle, message: u.partial(outcome.sent, outcome.total) };
}
