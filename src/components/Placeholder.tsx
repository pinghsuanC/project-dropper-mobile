// Temporary stand-in for a screen until it's built: its title, the test state it was
// opened in (from the testing menu) and any extra lines. Deliberately unstyled. Delete once
// no route uses it.
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { strings } from '@/constants/strings';

type Props = {
  title: string;
  /** The screen's state from useScreenState; shown as one line when set. */
  state?: string;
  children?: ReactNode;
};

export function Placeholder({ title, state, children }: Props) {
  return (
    <View>
      <Text accessibilityRole="header">{title}</Text>
      {state !== undefined && <Text>{strings.dev.stateLine(state)}</Text>}
      {children}
    </View>
  );
}
