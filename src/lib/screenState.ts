// Reads the testing menu's `state` search param for a screen (context/details/1020).
// A screen passes its own state list from src/constants/screenStates.ts and gets back one
// of those values, or undefined for anything else. Always undefined in prod builds, so no
// deep link can put a release build in a test state.
import { useLocalSearchParams } from 'expo-router';

import { SHOW_TESTING_MENU } from '@/constants/config';

type StateList = Readonly<Record<string, string>>;

/** The value when it's exactly one of `states`; undefined for missing, unknown or array values. */
export function parseScreenState<S extends StateList>(
  raw: string | string[] | undefined,
  states: S,
): S[keyof S] | undefined {
  if (typeof raw !== 'string') return undefined;
  return Object.values(states).find((state): state is S[keyof S] => state === raw);
}

/** This screen's state from `?state=`, or undefined (always undefined in prod). */
export function useScreenState<S extends StateList>(states: S): S[keyof S] | undefined {
  const { state } = useLocalSearchParams<{ state?: string | string[] }>();
  if (!SHOW_TESTING_MENU) return undefined;
  return parseScreenState(state, states);
}
