// The testing menu's list (context/details/1020, prototype context/prototypes/dev/dev-menu.png).
import type { Href } from 'expo-router';

import {
  HomeState,
  PairingScanState,
  PairingWaitState,
  PropertiesState,
  RegisterState,
  ServerConfigState,
  ServerFilesState,
  ShareState,
  UploadState,
} from '@/constants/screenStates';
import { strings } from '@/constants/strings';

import { DEV_ROUTES } from './devRoutes';

const { sections } = strings.dev;

/** The app's screens (context/details/1030), without the menu itself. */
const ROUTES = [
  '/update-server-config',
  '/',
  '/register',
  '/home',
  '/server-files',
  '/upload',
  '/pairing/scan',
  '/pairing/wait',
  '/share',
  '/properties',
];

const pathOf = (href: Href) => (typeof href === 'string' ? href : href.pathname);
const stateOf = (href: Href) => (typeof href === 'string' ? undefined : href.params?.state);
const allEntries = () => DEV_ROUTES.flatMap((section) => section.entries);

test('lists the prototype sections in order, after the server config (1100)', () => {
  expect(DEV_ROUTES.map((s) => s.title)).toEqual([
    sections.serverConfig,
    sections.landing,
    sections.register,
    sections.home,
    sections.pairing,
    sections.server,
    sections.upload,
    sections.sharing,
    sections.device,
  ]);
});

test('each section has the prototype number of entries (Landing: one, it runs for real)', () => {
  expect(DEV_ROUTES.map((s) => s.entries.length)).toEqual([5, 1, 3, 4, 6, 2, 5, 3, 2]);
});

test('every entry has a label, and no two entries share one', () => {
  const labels = allEntries().map((e) => e.label);
  for (const label of labels) expect(label.trim()).not.toBe('');
  expect(new Set(labels).size).toBe(labels.length);
});

test('every entry opens one of the app screens, never the menu itself', () => {
  for (const { href } of allEntries()) {
    expect(ROUTES).toContain(pathOf(href));
  }
});

test('screens with a default view have a plain entry, and states use a camelCase `state` param', () => {
  // Pairing step 2 has none: opened without a code from step 1 it shows its error.
  const plain = allEntries().filter((e) => stateOf(e.href) === undefined).map((e) => pathOf(e.href));
  expect(plain).toEqual(expect.arrayContaining(['/update-server-config', '/', '/register', '/pairing/scan', '/upload', '/share', '/properties']));

  for (const { href } of allEntries()) {
    const state = stateOf(href);
    if (state !== undefined) expect(state).toMatch(/^[a-z][A-Za-z]*$/); // camelCase
  }
});

test('no two entries open the same screen in the same state', () => {
  const keys = allEntries().map((e) => `${pathOf(e.href)}?${stateOf(e.href) ?? ''}`);
  expect(new Set(keys).size).toBe(keys.length);
});

test('Landing is never sent a state: it always runs the real start-up', () => {
  const landing = allEntries().filter((e) => pathOf(e.href) === '/');
  expect(landing).toHaveLength(1);
  expect(stateOf(landing[0].href)).toBeUndefined();
});

/** Each screen's state list (src/constants/screenStates.ts). Landing has none. */
const STATES_BY_PATH: Record<string, Record<string, string>> = {
  '/update-server-config': ServerConfigState,
  '/': {},
  '/register': RegisterState,
  '/home': HomeState,
  '/pairing/scan': PairingScanState,
  '/pairing/wait': PairingWaitState,
  '/server-files': ServerFilesState,
  '/upload': UploadState,
  '/share': ShareState,
  '/properties': PropertiesState,
};

test("every entry's state is on its screen's list", () => {
  for (const { href } of allEntries()) {
    const state = stateOf(href);
    if (state !== undefined) expect(Object.values(STATES_BY_PATH[pathOf(href)])).toContain(state);
  }
});

test("every state on a screen's list has a menu entry", () => {
  const keys = allEntries().map((e) => `${pathOf(e.href)}?${stateOf(e.href) ?? ''}`);
  for (const [path, states] of Object.entries(STATES_BY_PATH)) {
    for (const state of Object.values(states)) expect(keys).toContain(`${path}?${state}`);
  }
});
