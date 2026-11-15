// All user-facing text, grouped by screen. Text with values in it is a function.

export const strings = {
  /** Text inside the shared UI components (src/components/ui/). */
  ui: {
    gifPlaceholder: 'GIF',
    terminalTitle: 'DROPPER.EXE',
    terminalCursor: '_',
    /** Title-bar buttons' accessibility labels (the pictograms are drawn, not text). */
    titleBar: {
      minimize: 'Minimize',
      maximize: 'Maximize',
      close: 'Close',
    },
  },
  landing: {
    connecting: 'Trying to connect ...',
    notRegisteredTitle: 'Not registered',
    notRegistered: 'You are not welcomed yet. Redirecting you to register...',
    welcomeTitle: 'Welcome back',
    welcome: (userName: string) => `Welcome back ${userName}, redirecting..`,
    welcomeNoName: 'Welcome back, redirecting..',
    unreachableTitle: 'Server unreachable',
    unreachable: "Can't reach your server. Make sure it's running, then retry.",
    retry: 'Retry',
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
  /** Testing menu (local and dev builds only, context/details/1020). */
  dev: {
    banner: 'DEV ONLY',
    footer: 'Tap the yellow DEV button on any screen to come back here.',
    button: 'DEV',
    buttonLabel: 'Open testing menu',
    sections: {
      landing: 'Landing',
      register: 'Register',
      home: 'Home',
      pairing: 'Pairing',
      server: 'Server',
      upload: 'Upload',
      sharing: 'Sharing',
      device: 'Device & User',
    },
    entries: {
      landing: 'Landing',
      register: 'Register',
      registerUnreachable: 'Error - server unreachable',
      registerServerError: 'Error - server error',
      homeUnpaired: 'Unpaired',
      homePaired: 'Paired',
      homeServerError: 'Paired - server error',
      pairingScan: 'Step 1 - scan',
      pairingWait: 'Step 2 - wait',
      pairingCameraNote: 'Step 1 - camera note',
      pairingCamera: 'Step 1 - camera',
      pairingScanError: 'Step 1 - error',
      pairingWaitError: 'Step 2 - error',
      serverEmpty: 'Server status - empty',
      serverFiles: 'Server status - files',
      uploadStart: 'Upload - start',
      uploadInProgress: 'Upload - in progress',
      uploadPartialFailed: 'Upload - partial failed',
      uploadTooLarge: 'Upload - file too large',
      uploadSuccess: 'Upload - success',
      shareReady: 'Shared file to PC',
      shareLoading: 'Shared file - loading',
      shareError: 'Shared file - error',
      properties: 'Properties',
      propertiesNotPaired: 'Properties - not paired',
    },
  },
} as const;
