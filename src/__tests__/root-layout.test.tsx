// The root layout keeps the splash screen up until the fonts are loaded (2020 plan step 6).
import * as SplashScreen from 'expo-splash-screen';
import { renderRouter, screen } from 'expo-router/testing-library';

import { fontFiles } from '@/components/ui/fonts';
import { strings } from '@/constants/strings';
import { fonts } from '@/theme';

const mockUseFonts = jest.fn();
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: (...args: unknown[]) => mockUseFonts(...args),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  mockUseFonts.mockReset();
  jest.mocked(SplashScreen.hideAsync).mockClear();
});

test('the font files register exactly the families the theme uses', () => {
  expect(Object.keys(fontFiles).sort()).toEqual(Object.values(fonts).sort());
});

test('loads the theme fonts', async () => {
  mockUseFonts.mockReturnValue([true, null]);
  await renderRouter('./src/app', { initialUrl: '/register' });
  expect(mockUseFonts).toHaveBeenCalledWith(fontFiles);
});

test('shows nothing and keeps the splash screen while fonts load', async () => {
  mockUseFonts.mockReturnValue([false, null]);
  await renderRouter('./src/app', { initialUrl: '/register' });
  expect(screen.queryByText(strings.register.title)).toBeNull();
  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
});

test('renders the app and hides the splash screen once fonts are loaded', async () => {
  mockUseFonts.mockReturnValue([true, null]);
  await renderRouter('./src/app', { initialUrl: '/register' });
  expect(screen.getByText(strings.register.title)).toBeTruthy();
  expect(SplashScreen.hideAsync).toHaveBeenCalled();
});

test('still renders (with system fonts) if a font fails to load', async () => {
  mockUseFonts.mockReturnValue([false, new Error('font failed')]);
  await renderRouter('./src/app', { initialUrl: '/register' });
  expect(screen.getByText(strings.register.title)).toBeTruthy();
  expect(SplashScreen.hideAsync).toHaveBeenCalled();
});
