// Server enums (context/details/1040), copied from file-dropper/server/enums.py.
// The values go over the wire: keep them identical to the server's.
// Each is an `as const` object (the values) plus a union type of the same name.
// Sharing the name is the point (value + type, like a StrEnum), and TypeScript allows it.
/* eslint-disable @typescript-eslint/no-redeclare */

export const DeviceStatus = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
} as const;
export type DeviceStatus = (typeof DeviceStatus)[keyof typeof DeviceStatus];

export const Platform = {
  DESKTOP: 'desktop',
  ANDROID: 'android',
  IOS: 'ios',
} as const;
export type Platform = (typeof Platform)[keyof typeof Platform];

export const SessionStatus = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const FileStatus = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  DELETED: 'deleted',
  DOWNLOADED: 'downloaded',
} as const;
export type FileStatus = (typeof FileStatus)[keyof typeof FileStatus];
