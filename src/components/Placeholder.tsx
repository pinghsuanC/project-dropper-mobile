// Temporary stand-in for a screen until it's built: its title, the test state it was
// opened in (from the testing menu), any extra lines, and links to the screens it leads
// to. Deliberately unstyled. Delete once no route uses it.
import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { strings } from '@/constants/strings';

export type PlaceholderLink = { label: string; href: Href };

type Props = {
  title: string;
  /** The screen's state from useScreenState; shown as one line when set. */
  state?: string;
  links?: PlaceholderLink[];
  children?: ReactNode;
};

export function Placeholder({ title, state, links = [], children }: Props) {
  return (
    <View>
      <Text accessibilityRole="header">{title}</Text>
      {state !== undefined && <Text>{strings.dev.stateLine(state)}</Text>}
      {children}
      {links.map(({ label, href }) => (
        <Link key={label} href={href}>
          {label}
        </Link>
      ))}
    </View>
  );
}
