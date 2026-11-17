// Mock `GET /files/sent` answers for the testing menu's Server files states (1020), the
// prototype's MOCK_SERVER_FILES. Times are counted back from `now`, so "Today" and
// "Yesterday" always show. Never used outside testing-menu states.
import type { SentFile } from '@/api/types';

const MB = 1024 ** 2;
const HOUR = 60 * 60;
const DAY = 24 * HOUR;

export function mockSentFiles(now: Date): SentFile[] {
  const t = Math.floor(now.getTime() / 1000);
  const file = (n: number, file_name: string, size: number, ago: number, status: SentFile['status'] = 'uploaded') => ({
    file_id: `mock-${n}`,
    file_name,
    size,
    status,
    receiver_name: 'DESKTOP-01',
    created_at: t - ago,
  });
  return [
    file(1, 'holiday-photo.jpg', 2.3 * MB, 0),
    file(2, 'report-final.pdf', 845 * 1024, 14 * 60),
    file(3, 'screen-recording.mp4', 48 * MB, DAY),
    file(4, 'IMG_20261110_093512.jpg', 3.2 * MB, 3 * DAY),
    file(5, 'notes.txt', 2150, 4 * DAY, 'pending'),
    file(6, 'boarding-pass.pdf', 402 * 1024, 10 * DAY),
  ];
}
