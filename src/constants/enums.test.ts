import { DeviceStatus, FileStatus, Platform, SessionStatus } from './enums';

// The values go over the wire, so they must match file-dropper/server/enums.py exactly.
test.each([
  ['DeviceStatus', DeviceStatus, { ACTIVE: 'active', REVOKED: 'revoked' }],
  ['Platform', Platform, { DESKTOP: 'desktop', ANDROID: 'android', IOS: 'ios' }],
  ['SessionStatus', SessionStatus, { ACTIVE: 'active', REVOKED: 'revoked' }],
  [
    'FileStatus',
    FileStatus,
    { PENDING: 'pending', UPLOADED: 'uploaded', DELETED: 'deleted', DOWNLOADED: 'downloaded' },
  ],
])('%s matches the server', (_name, actual, expected) => {
  expect(actual).toEqual(expected);
});
