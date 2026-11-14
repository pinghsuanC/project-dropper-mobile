// All user-facing text, grouped by screen. Text with values in it is a function.
// The screens are placeholders for now: titles and the buttons between them.

export const strings = {
  landing: {
    title: 'Landing',
    toHome: 'Go to Home',
    toRegister: 'Go to Register',
  },
  register: {
    title: 'Register',
    toHome: 'Register this phone',
  },
  home: {
    title: 'Home',
    paired: (pcName: string) => `Paired with ${pcName}`,
    unpaired: 'Not paired with a PC',
    toPairing: 'Pair with your PC',
    toServerFiles: 'View server files',
    toUpload: 'Upload files',
  },
  taskbar: {
    properties: 'Properties',
  },
  pairing: {
    scanTitle: 'Pairing step 1: scan the QR code',
    toWait: 'QR code scanned',
    waitTitle: 'Pairing step 2: waiting for the server',
    toHome: 'Paired, go to Home',
  },
  serverFiles: {
    title: 'Server files',
  },
  upload: {
    title: 'Upload',
  },
  share: {
    title: 'Send to your PC',
  },
  properties: {
    title: 'Properties',
  },
} as const;
