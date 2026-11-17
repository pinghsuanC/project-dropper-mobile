// The Upload screen's testing-menu looks (1020, 1090): a mock queue, how far a running upload
// is, and the popup, as in the prototypes. Never used outside testing-menu states.
import { UploadState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { pickProblem, type QueuedFile, type QueueStatus, type UploadPopup } from '@/lib/uploadQueue';

const MB = 1024 ** 2;
const u = strings.upload;

export type UploadLook = {
  queue: QueuedFile[];
  /** A running upload: which file of how many. */
  sending: { current: number; total: number } | null;
  popup: UploadPopup | null;
};

const file = (name: string, size: number, status: QueueStatus = 'queued', progress?: number): QueuedFile => ({
  id: `mock-${name}`,
  uri: `mock://${name}`,
  name,
  size,
  status,
  progress,
});

export function mockUploadLook(state: UploadState): UploadLook {
  switch (state) {
    case UploadState.IN_PROGRESS:
      return {
        queue: [file('report-final.pdf', 845 * 1024, 'sending', 0.45), file('screen-recording.mp4', 48 * MB, 'waiting')],
        sending: { current: 2, total: 3 },
        popup: null,
      };
    case UploadState.PARTIAL_FAILED:
      return {
        queue: [file('screen-recording.mp4', 48 * MB, 'failed')],
        sending: null,
        popup: { kind: 'error', title: u.popupTitle, message: u.partial(2, 3) },
      };
    case UploadState.TOO_LARGE:
      return {
        queue: [file('holiday-photo.jpg', 2.3 * MB), file('report-final.pdf', 845 * 1024)],
        sending: null,
        popup: pickProblem({ tooLarge: [{ name: 'family-video.mov', uri: 'mock://video', size: 2.4 * 1024 * MB }], unknownSize: [] }),
      };
    case UploadState.SUCCESS:
      return {
        queue: [],
        sending: null,
        popup: { kind: 'info', title: u.popupTitle, heading: u.complete, message: u.sent(3) },
      };
  }
}
