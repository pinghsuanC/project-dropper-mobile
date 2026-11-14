// A raised face-coloured box with a TitleBar and a padded body (2010).
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/theme';

import { Bevel } from '../primitives/Bevel';
import { TitleBar } from './TitleBar';

type Props = {
  title: string;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  children?: ReactNode;
  /** Size and position of the window. */
  style?: StyleProp<ViewStyle>;
  /** Overrides the body's padding and layout. */
  bodyStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Window({ title, onMinimize, onMaximize, onClose, children, style, bodyStyle, testID }: Props) {
  return (
    <Bevel kind="raised" style={style} innerStyle={styles.frame} testID={testID}>
      <TitleBar title={title} onMinimize={onMinimize} onMaximize={onMaximize} onClose={onClose} />
      <View testID={testID ? `${testID}-body` : undefined} style={[styles.body, bodyStyle]}>
        {children}
      </View>
    </Bevel>
  );
}

const styles = StyleSheet.create({
  frame: { padding: spacing.xxs },
  body: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
});
