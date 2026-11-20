// The testing menu's entries (context/details/1020), in the prototype's order
// (context/prototypes/dev/dev-menu.png). An entry for a screen state passes a `state` search
// param from src/constants/screenStates.ts; screens read it with useScreenState. Landing
// has one entry and no state: it always runs the real start-up.
import type { Href } from 'expo-router';

import {
  HomeState,
  PairingScanState,
  PairingWaitState,
  PropertiesState,
  RegisterState,
  ServerFilesState,
  ShareState,
  UploadState,
} from '@/constants/screenStates';
import { strings } from '@/constants/strings';

export type DevEntry = { label: string; href: Href };
export type DevSection = { title: string; entries: DevEntry[] };

const { sections, entries } = strings.dev;

export const DEV_ROUTES: DevSection[] = [
  {
    title: sections.landing,
    entries: [{ label: entries.landing, href: '/' }],
  },
  {
    title: sections.register,
    entries: [
      { label: entries.register, href: '/register' },
      { label: entries.registerUnreachable, href: { pathname: '/register', params: { state: RegisterState.UNREACHABLE } } },
      { label: entries.registerServerError, href: { pathname: '/register', params: { state: RegisterState.SERVER_ERROR } } },
    ],
  },
  {
    title: sections.home,
    entries: [
      { label: entries.homeUnpaired, href: { pathname: '/home', params: { state: HomeState.UNPAIRED } } },
      { label: entries.homePaired, href: { pathname: '/home', params: { state: HomeState.PAIRED } } },
      { label: entries.homeChecking, href: { pathname: '/home', params: { state: HomeState.CHECKING } } },
      { label: entries.homeServerError, href: { pathname: '/home', params: { state: HomeState.SERVER_ERROR } } },
    ],
  },
  {
    title: sections.pairing,
    entries: [
      { label: entries.pairingScan, href: '/pairing/scan' },
      { label: entries.pairingWait, href: { pathname: '/pairing/wait', params: { state: PairingWaitState.WAITING } } },
      { label: entries.pairingCameraNote, href: { pathname: '/pairing/scan', params: { state: PairingScanState.CAMERA_NOTE } } },
      { label: entries.pairingCamera, href: { pathname: '/pairing/scan', params: { state: PairingScanState.CAMERA } } },
      { label: entries.pairingScanError, href: { pathname: '/pairing/scan', params: { state: PairingScanState.ERROR } } },
      { label: entries.pairingWaitError, href: { pathname: '/pairing/wait', params: { state: PairingWaitState.ERROR } } },
    ],
  },
  {
    title: sections.server,
    entries: [
      { label: entries.serverEmpty, href: { pathname: '/server-files', params: { state: ServerFilesState.EMPTY } } },
      { label: entries.serverFiles, href: { pathname: '/server-files', params: { state: ServerFilesState.FILES } } },
    ],
  },
  {
    title: sections.upload,
    entries: [
      { label: entries.uploadStart, href: '/upload' },
      { label: entries.uploadInProgress, href: { pathname: '/upload', params: { state: UploadState.IN_PROGRESS } } },
      { label: entries.uploadPartialFailed, href: { pathname: '/upload', params: { state: UploadState.PARTIAL_FAILED } } },
      { label: entries.uploadTooLarge, href: { pathname: '/upload', params: { state: UploadState.TOO_LARGE } } },
      { label: entries.uploadSuccess, href: { pathname: '/upload', params: { state: UploadState.SUCCESS } } },
    ],
  },
  {
    title: sections.sharing,
    entries: [
      { label: entries.shareReady, href: { pathname: '/share', params: { state: ShareState.READY } } },
      { label: entries.shareLoading, href: '/share' },
      { label: entries.shareError, href: { pathname: '/share', params: { state: ShareState.ERROR } } },
    ],
  },
  {
    title: sections.device,
    entries: [
      { label: entries.properties, href: '/properties' },
      { label: entries.propertiesNotPaired, href: { pathname: '/properties', params: { state: PropertiesState.NOT_PAIRED } } },
    ],
  },
];
