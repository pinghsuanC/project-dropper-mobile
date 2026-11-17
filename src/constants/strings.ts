// All user-facing text, grouped by screen. Text with values in it is a function.
import type { FileStatus } from './enums';

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
    balloonTitle: "Let's pair!",
    balloonText: 'Please run the program on your computer. A QR code should appear for this phone.',
    stepOneTitle: 'Pair with your PC — Step 1 of 2',
    noShare: "Don't share the QR code with anyone.",
    validFor: 'The QR code is only valid for 60s.',
    scanPrompt: 'Scan the QR code on your PC',
    openCamera: 'Open camera',
    fingerprintNote:
      'The connection is done between device fingerprints, a factory reset of your phone will need a re-pairing.',
    onePcNote: 'Currently you can only connect with 1 PC.',
    /** The note before Android's camera permission prompt. */
    cameraNoteTitle: 'Camera',
    cameraNoteHeading: 'Camera access',
    cameraNote: 'File Dropper uses the camera only to read the QR code on your PC. Android will ask for permission next.',
    continue: 'Continue',
    notNow: 'Not now',
    /** The camera window. */
    scanTitle: 'Scan QR code',
    pointCamera: 'Point the camera at the QR code on your PC.',
    looking: 'Looking for a QR code…',
    cancel: 'Cancel',
    scanError: "Couldn't scan the QR code. Make sure camera access is allowed, then try again.",
    ok: 'OK',
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
    /**
     * A file row's second line: "2.3 MB · JPG · Uploaded Today 4:12 PM · Pending". `when` is the
     * upload time (formatWhen); `type` and `status` are left out when missing.
     */
    fileDetail: ({ size, type, when, status }: { size: string; type?: string; when: string; status?: string }) =>
      [size, type, `Uploaded ${when}`, status].filter(Boolean).join(' · '),
    /** What a screen reader says for a file row: the full name, then its second line. */
    rowLabel: (name: string, detail: string) => `${name}, ${detail}`,
    /** A file's server status (constants/enums.ts FileStatus), as shown in file lists. */
    fileStatus: {
      pending: 'Pending',
      uploaded: 'Uploaded',
      downloaded: 'Downloaded',
      deleted: 'Deleted',
    } satisfies Record<FileStatus, string>,
  },
  upload: {
    title: 'Pending upload',
    search: 'Search files',
    empty: 'Your upload queue is empty',
    noMatch: (query: string) => `No files match "${query}"`,
    clearAll: 'Clear all',
    add: 'Add…',
    upload: 'Upload',
    sending: 'Sending…',
    /** A queued row's ✕, for screen readers. */
    remove: (name: string) => `Remove ${name}`,
    waiting: 'Waiting',
    failed: 'Failed',
    percent: (n: number) => `${n}%`,
    /** What a screen reader says for a queued row: name, size, then its status when it has one. */
    rowLabel: (name: string, size: string, status?: string) => [name, size, status].filter(Boolean).join(', '),
    /** Status bar segments. */
    checking: 'Checking…',
    connected: 'Connected',
    notConnected: 'Not connected',
    serverError: "Can't reach server",
    fileCount: (n: number) => (n === 1 ? '1 file' : `${n} files`),
    sendingCount: (current: number, total: number) => `Sending ${current} of ${total}`,
    /** Picking files. */
    tooLargeOne: (name: string, size: string, max: string) => `${name} is too large (${size}). Files can be up to ${max}.`,
    tooLargeMany: (count: number, max: string) => `${count} files are too large. Files can be up to ${max}.`,
    unknownSizeOne: (name: string) => `Couldn't read the size of ${name}.`,
    unknownSizeMany: (count: number) => `Couldn't read the size of ${count} files.`,
    pickError: "Couldn't open your files. Please try again.",
    /** Result popups. */
    popupTitle: 'Upload',
    complete: 'Upload complete',
    sent: (n: number) => (n === 1 ? '1 file sent to your PC.' : `${n} files sent to your PC.`),
    partial: (sent: number, total: number) => `${sent} of ${total} sent. Please retry.`,
    ok: 'OK',
    /** The Back window. */
    backTitle: 'Back',
    backPrompt: 'Back to home screen?',
    backNote:
      'Only In-progress items will be preserved. Failed items will be automatically removed once leaving this screen. Please check the files uploaded on the server page.',
    confirm: 'Confirm',
    cancel: 'Cancel',
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
