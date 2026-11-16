// Bevelled push button (2010). Pressed: the bevel sinks and the content moves 1px with a
// transform, so the button never changes size. Disabled: greyed label, no presses.
import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { sizes, spacing } from '@/theme';

import { Bevel } from '../primitives/Bevel';
import { Text } from '../primitives/Text';

export type ButtonVariant = 'default' | 'large' | 'start';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** `large`: icon above the label. `start`: taskbar button, icon left of the label. */
  variant?: ButtonVariant;
  icon?: ReactNode;
  /** Size and position (e.g. a fixed width). */
  style?: StyleProp<ViewStyle>;
  /** The pressable view, e.g. to move screen-reader focus to it. */
  ref?: Ref<ComponentRef<typeof View>>;
  testID?: string;
};

const PRESS_SHIFT = 1;

export function Button({ label, onPress, disabled = false, variant = 'default', icon, style, ref, testID }: Props) {
  const [pressed, setPressed] = useState(false);
  const sunk = pressed && !disabled;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <Bevel
        kind={sunk ? 'sunken' : 'raised'}
        style={[styles.button, variant === 'start' && styles.start, style]}
        innerStyle={[styles.inner, variant === 'large' ? styles.innerLarge : styles.innerDefault]}
        testID={testID}
      >
        <View
          testID={testID ? `${testID}-content` : undefined}
          style={[
            variant === 'large' ? styles.column : styles.row,
            sunk && styles.pressedContent,
          ]}
        >
          {icon}
          <Text variant={variant === 'large' ? 'actionLarge' : 'action'} tone={disabled ? 'disabled' : 'normal'} align="center">
            {label}
          </Text>
        </View>
      </Bevel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: sizes.touchTarget, minHeight: sizes.touchTarget },
  start: { alignSelf: 'flex-start' },
  inner: { alignItems: 'center', justifyContent: 'center' },
  innerDefault: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  innerLarge: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  column: { flexDirection: 'column', alignItems: 'center', gap: sizes.buttonIconGap },
  pressedContent: { transform: [{ translateX: PRESS_SHIFT }, { translateY: PRESS_SHIFT }] },
});
