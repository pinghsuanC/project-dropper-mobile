// Temporary stand-in for a screen until it's built: its title, any extra lines, and
// links to the screens it leads to. Deliberately unstyled. Delete once no route uses it.
import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export type PlaceholderLink = { label: string; href: Href };

type Props = {
  title: string;
  links?: PlaceholderLink[];
  children?: ReactNode;
};

export function Placeholder({ title, links = [], children }: Props) {
  return (
    <View>
      <Text accessibilityRole="header">{title}</Text>
      {children}
      {links.map(({ label, href }) => (
        <Link key={label} href={href}>
          {label}
        </Link>
      ))}
    </View>
  );
}
