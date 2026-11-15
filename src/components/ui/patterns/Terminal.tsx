// The DROPPER.EXE window: a black terminal showing `lines`, with a blinking cursor (2010).
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, motion, spacing } from '@/theme';

import { Window } from '../controls/Window';
import { Bevel } from '../primitives/Bevel';
import { Text } from '../primitives/Text';

type Props = {
  lines: readonly string[];
  /** Size and position of the window. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Terminal({ lines, style, testID }: Props) {
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCursorOn((on) => !on), motion.cursorBlinkMs);
    return () => clearInterval(timer);
  }, []);

  return (
    <Window title={strings.ui.terminalTitle} style={style} bodyStyle={styles.body} testID={testID}>
      <Bevel
        kind="sunken"
        fill={colors.terminal}
        style={styles.screen}
        innerStyle={styles.screenInner}
        testID={testID ? `${testID}-screen` : undefined}
      >
        {lines.map((line, index) => (
          <Text key={index} variant="terminal" tone="terminal">
            {line}
          </Text>
        ))}
        <View
          testID={testID ? `${testID}-cursor` : undefined}
          style={{ opacity: cursorOn ? 1 : 0 }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text variant="terminal" tone="terminal">
            {strings.ui.terminalCursor}
          </Text>
        </View>
      </Bevel>
    </Window>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.xs },
  screen: { flex: 1 },
  screenInner: { padding: spacing.lg },
});
