// Reading the testing menu's `state` param (context/details/1020).
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { HomeState, RegisterState } from '@/constants/screenStates';

import { parseScreenState, useScreenState } from './screenState';

// SHOW_TESTING_MENU is fixed when config.ts loads; a getter lets each test pick it. It's
// added with defineProperty: an object spread would copy the getter's value once.
let mockShowMenu = true;
jest.mock('@/constants/config', () =>
  Object.defineProperty({ ...jest.requireActual('@/constants/config') }, 'SHOW_TESTING_MENU', {
    get: () => mockShowMenu,
  }),
);

beforeEach(() => {
  mockShowMenu = true;
});

describe('parseScreenState', () => {
  test('returns a value on the list', () => {
    expect(parseScreenState('serverError', RegisterState)).toBe('serverError');
  });

  test.each([
    ['a missing value', undefined],
    ['an empty value', ''],
    ['an unknown value', 'bogus'],
    ["another screen's state", 'paired'],
    ['the wrong case', 'ServerError'],
    ['an array', ['serverError', 'unreachable']],
  ])('ignores %s', (_name, raw) => {
    expect(parseScreenState(raw, RegisterState)).toBeUndefined();
  });
});

describe('useScreenState', () => {
  function Probe() {
    const state = useScreenState(HomeState);
    return <Text testID="probe">{state ?? 'none'}</Text>;
  }

  const openAt = (url: string) => renderRouter({ probe: Probe }, { initialUrl: url });
  const shown = () => screen.getByTestId('probe').props.children;

  test('returns the screen state from the URL', async () => {
    await openAt('/probe?state=paired');
    expect(shown()).toBe('paired');
  });

  test('returns undefined for a state not on the list', async () => {
    await openAt('/probe?state=unreachable');
    expect(shown()).toBe('none');
  });

  test('returns undefined with no state', async () => {
    await openAt('/probe');
    expect(shown()).toBe('none');
  });

  test('ignores the state in prod builds', async () => {
    mockShowMenu = false;
    await openAt('/probe?state=paired');
    expect(shown()).toBe('none');
  });
});
