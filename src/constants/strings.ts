// All user-facing text, grouped by screen. Text with values in it is a function.

export const strings = {
  /** Text inside the shared UI components (src/components/ui/). */
  ui: {
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
    /** The balloon's first line, by part of day; `name` is the user name or `friend`. */
    greeting: {
      morning: (name: string) => `Good morning, ${name}`,
      afternoon: (name: string) => `Good afternoon, ${name}`,
      evening: (name: string) => `Good evening, ${name}`,
    },
    /** Used in the greeting when no user name is stored. */
    friend: 'friend',
    quoteLabel: 'QUOTE OF THE DAY',
    titleUnpaired: 'Not connected to a PC',
    titlePaired: 'Connected to your server',
    titleServerError: "Can't reach your server",
    connect: 'I want to connect to my PC',
    viewServerFiles: 'View server files',
    retry: 'Retry',
    /** The big button and the status line while Home checks its connection. */
    checking: 'Checking…',
    serverConnected: 'Server connected',
    serverError: 'Server error, please check your server and retry.',
    uploadTitle: 'Upload',
    uploadPrompt: 'Do you want to upload?',
    yes: 'Yes',
    no: 'No',
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
    title: 'Server status',
    search: 'Search files',
    empty: 'No files on server',
    noMatch: (query: string) => `No files match "${query}"`,
    loading: 'Loading…',
    loadError: "Can't reach your server",
    retry: 'Retry',
    back: 'Back',
  },
  /** File sizes and times in file lists (lib/format.ts). */
  format: {
    size: { B: (n: string) => `${n} B`, KB: (n: string) => `${n} KB`, MB: (n: string) => `${n} MB`, GB: (n: string) => `${n} GB` },
    today: (time: string) => `Today ${time}`,
    yesterday: 'Yesterday',
    /** A file row's second line. */
    sizeAndWhen: (size: string, when: string) => `${size} · ${when}`,
    /** What a screen reader says for a file row: the full name, then its second line. */
    rowLabel: (name: string, detail: string) => `${name}, ${detail}`,
    /** A `pending` file: its upload started but was never confirmed. */
    incomplete: 'Incomplete',
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
      homeChecking: 'Paired - checking',
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
