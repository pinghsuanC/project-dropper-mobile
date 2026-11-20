// Each screen's states, which the testing menu opens with a `state` search param
// (context/details/1020). Screens read them through useScreenState (src/lib/screenState.ts)
// and the menu builds its entries from them, so neither can name a state the other lacks.
// Same shape as the server enums (1040): an `as const` object plus a union type of the
// same name. Values are camelCase. Landing has none: it always runs the real start-up.
/* eslint-disable @typescript-eslint/no-redeclare */

export const RegisterState = {
  UNREACHABLE: 'unreachable',
  SERVER_ERROR: 'serverError',
} as const;
export type RegisterState = (typeof RegisterState)[keyof typeof RegisterState];

export const HomeState = {
  UNPAIRED: 'unpaired',
  PAIRED: 'paired',
  CHECKING: 'checking',
  SERVER_ERROR: 'serverError',
} as const;
export type HomeState = (typeof HomeState)[keyof typeof HomeState];

export const PairingScanState = {
  CAMERA_NOTE: 'cameraNote',
  CAMERA: 'camera',
  ERROR: 'error',
} as const;
export type PairingScanState = (typeof PairingScanState)[keyof typeof PairingScanState];

export const PairingWaitState = {
  WAITING: 'waiting',
  ERROR: 'error',
} as const;
export type PairingWaitState = (typeof PairingWaitState)[keyof typeof PairingWaitState];

export const ServerFilesState = {
  EMPTY: 'empty',
  FILES: 'files',
} as const;
export type ServerFilesState = (typeof ServerFilesState)[keyof typeof ServerFilesState];

export const UploadState = {
  IN_PROGRESS: 'inProgress',
  PARTIAL_FAILED: 'partialFailed',
  TOO_LARGE: 'tooLarge',
  SUCCESS: 'success',
} as const;
export type UploadState = (typeof UploadState)[keyof typeof UploadState];

export const ShareState = {
  READY: 'ready',
  ERROR: 'error',
} as const;
export type ShareState = (typeof ShareState)[keyof typeof ShareState];

export const PropertiesState = {
  NOT_PAIRED: 'notPaired',
} as const;
export type PropertiesState = (typeof PropertiesState)[keyof typeof PropertiesState];
