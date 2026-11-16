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
    textField: {
      /** The counter under a field with a length limit. */
      count: (length: number, max: number) => `${length}/${max}`,
      /** What screen readers say for the counter. */
      countLabel: (length: number, max: number) => `${length} of ${max} characters`,
    },
    dialog: {
      /** Default heading of an error dialog. */
      error: 'Error',
      code: 'Code',
      details: 'Details',
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
    title: 'Welcome to File Dropper',
    intro:
      "This phone isn't registered yet. Tell us your name, and give this phone a name so your desktop can recognize it.",
    userNameLabel: 'Your name',
    userNamePlaceholder: 'e.g. Alex',
    userNameHint: 'What the app calls you.',
    deviceNameLabel: 'Device name',
    deviceNameDefault: 'My Android phone',
    deviceNameHint: 'Letters, numbers, spaces, - and _ only.',
    submit: 'Register this phone',
    userNameRequired: 'Please enter your name.',
    deviceNameRequired: 'Please enter a device name.',
    creatingKeys: 'Creating keys…',
    registering: 'Registering…',
    registered: 'Registered!',
    unreachable:
      "Couldn't reach your server, so this phone wasn't registered. Make sure the server is running, then try again.",
    serverError: "The server couldn't register this phone.",
    ok: 'OK',
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
    /** Shown on a placeholder screen opened in a test state from the menu. */
    stateLine: (state: string) => `Test state: ${state}`,
    /** Register's server-error test state shows these in the dialog's code box. */
    registerSampleCode: 'XXX',
    registerSampleDetails: '<detail from the server goes here>',
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
