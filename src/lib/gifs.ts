// GIF slots (2040) and their local fallback files in assets/gifs/. Session picks from the
// server come later; until then every slot shows its local file, or empty space when it
// has none.

export type GifSlot =
  | 'welcome'
  | 'notWelcome'
  | 'offline'
  | 'banner'
  | 'homeLeft'
  | 'homeRight'
  | 'homeMain'
  | 'sending'
  | 'loading';

// Static requires so Metro bundles the files. Relative paths: jest-expo maps every `@/…`
// to src/, so `@/assets/…` doesn't resolve in Jest.
const LOCAL_GIFS: Partial<Record<GifSlot, number>> = {
  welcome: require('../../assets/gifs/welcome.gif'),
  notWelcome: require('../../assets/gifs/notWelcome.gif'),
  offline: require('../../assets/gifs/offline.gif'),
  banner: require('../../assets/gifs/banner.gif'),
  homeLeft: require('../../assets/gifs/homeLeft.gif'),
  homeMain: require('../../assets/gifs/homeMain.gif'),
  sending: require('../../assets/gifs/sending.gif'),
  loading: require('../../assets/gifs/loading.gif'),
};

/** The slot's local GIF, or undefined when the slot has no file yet. */
export function localGif(slot: GifSlot): number | undefined {
  return LOCAL_GIFS[slot];
}
