// The testing menu's entries (context/details/1020), in the prototype's order
// (context/prototypes/dev/dev-menu.png). An entry for a screen state passes a `state` search
// param; screens read it once they're built. Landing has one entry and no state: it always
// runs the real start-up.
import type { Href } from 'expo-router';

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
      { label: entries.registerUnreachable, href: { pathname: '/register', params: { state: 'unreachable' } } },
      { label: entries.registerServerError, href: { pathname: '/register', params: { state: 'serverError' } } },
    ],
  },
  {
    title: sections.home,
    entries: [
      { label: entries.homeUnpaired, href: { pathname: '/home', params: { state: 'unpaired' } } },
      { label: entries.homePaired, href: { pathname: '/home', params: { state: 'paired' } } },
      { label: entries.homeServerError, href: { pathname: '/home', params: { state: 'serverError' } } },
    ],
  },
  {
    title: sections.pairing,
    entries: [
      { label: entries.pairingScan, href: '/pairing/scan' },
      { label: entries.pairingWait, href: '/pairing/wait' },
      { label: entries.pairingCameraNote, href: { pathname: '/pairing/scan', params: { state: 'cameraNote' } } },
      { label: entries.pairingCamera, href: { pathname: '/pairing/scan', params: { state: 'camera' } } },
      { label: entries.pairingScanError, href: { pathname: '/pairing/scan', params: { state: 'error' } } },
      { label: entries.pairingWaitError, href: { pathname: '/pairing/wait', params: { state: 'error' } } },
    ],
  },
  {
    title: sections.server,
    entries: [
      { label: entries.serverEmpty, href: { pathname: '/server-files', params: { state: 'empty' } } },
      { label: entries.serverFiles, href: { pathname: '/server-files', params: { state: 'files' } } },
    ],
  },
  {
    title: sections.upload,
    entries: [
      { label: entries.uploadStart, href: '/upload' },
      { label: entries.uploadInProgress, href: { pathname: '/upload', params: { state: 'inProgress' } } },
      { label: entries.uploadPartialFailed, href: { pathname: '/upload', params: { state: 'partialFailed' } } },
      { label: entries.uploadTooLarge, href: { pathname: '/upload', params: { state: 'tooLarge' } } },
      { label: entries.uploadSuccess, href: { pathname: '/upload', params: { state: 'success' } } },
    ],
  },
  {
    title: sections.sharing,
    entries: [
      { label: entries.shareReady, href: { pathname: '/share', params: { state: 'ready' } } },
      { label: entries.shareLoading, href: '/share' },
      { label: entries.shareError, href: { pathname: '/share', params: { state: 'error' } } },
    ],
  },
  {
    title: sections.device,
    entries: [
      { label: entries.properties, href: '/properties' },
      { label: entries.propertiesNotPaired, href: { pathname: '/properties', params: { state: 'notPaired' } } },
    ],
  },
];
