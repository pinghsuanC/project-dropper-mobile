// Modal popup (2010). Only `kind="error"` so far. Drawn as a full-screen overlay, not an RN
// `Modal`: a Modal is its own native window and would cover the DEV button, which must stay
// above popups. ✕ does what the secondary button does, or the primary when it's alone.
// `code` / `details` show in a sunken mono box, each row only when given.
//
// Screen readers: the overlay blocks touches on the screen behind, but on Android TalkBack can
// still move into it (`accessibilityViewIsModal` is iOS only). So while a Dialog is open, the
// screen must hide its own content: `importantForAccessibility="no-hide-descendants"` on the
// view that holds it. Android's Back button is the screen's to handle too (BackHandler).
import { useEffect, useRef, type ComponentRef } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, layers, sizes, spacing } from '@/theme';

import { Button } from '../controls/Button';
import { Window } from '../controls/Window';
import { Bevel } from '../primitives/Bevel';
import { Text } from '../primitives/Text';

export type DialogKind = 'error';

type DialogButton = { label: string; onPress: () => void };

type Props = {
  kind: DialogKind;
  /** Title-bar text and bold heading. Default: "Error". */
  heading?: string;
  message: string;
  /** E.g. an ApiError's status. */
  code?: string | number;
  /** E.g. an ApiError's detail, as text. */
  details?: string;
  primary: DialogButton;
  secondary?: DialogButton;
  testID?: string;
};

export function Dialog({ kind, heading = strings.ui.dialog.error, message, code, details, primary, secondary, testID }: Props) {
  const primaryRef = useRef<ComponentRef<typeof View>>(null);
  const id = (part: string) => (testID ? `${testID}-${part}` : undefined);
  const hasCode = code !== undefined && code !== '';
  const hasDetails = details !== undefined && details !== '';

  // Screen readers start on the primary button, as on a Windows dialog's default button.
  useEffect(() => {
    if (primaryRef.current) AccessibilityInfo.sendAccessibilityEvent(primaryRef.current, 'focus');
  }, []);

  return (
    <View style={styles.overlay} testID={id('overlay')}>
      <View accessibilityRole="alert" accessibilityViewIsModal style={styles.window} testID={testID}>
        <Window title={heading} onClose={(secondary ?? primary).onPress} bodyStyle={styles.body} testID={id('window')}>
          {kind === 'error' ? <ErrorIcon testID={id('icon')} /> : null}
          <Text bold align="center">
            {heading}
          </Text>
          <Text align="center">{message}</Text>
          {hasCode || hasDetails ? (
            <Bevel kind="field" style={styles.box} innerStyle={styles.boxInner} testID={id('box')}>
              {hasCode ? <Row label={strings.ui.dialog.code} value={String(code)} /> : null}
              {hasDetails ? <Row label={strings.ui.dialog.details} value={details} /> : null}
            </Bevel>
          ) : null}
          <View style={styles.buttons}>
            <Button ref={primaryRef} label={primary.label} onPress={primary.onPress} style={styles.button} />
            {secondary ? <Button label={secondary.label} onPress={secondary.onPress} style={styles.button} /> : null}
          </View>
        </Window>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
      </View>
      <View style={styles.rowValue}>
        <Text variant="mono">{value}</Text>
      </View>
    </View>
  );
}

/** Red disc with a white ✕, drawn with views (no icon font or SVG yet). Decorative. */
function ErrorIcon({ testID }: { testID?: string }) {
  return (
    <View testID={testID} style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.iconBar, styles.iconDown]} />
      <View style={[styles.iconBar, styles.iconUp]} />
    </View>
  );
}

const icon = sizes.dialogIcon;

const styles = StyleSheet.create({
  // Covers the screen (no dimming, as in the prototype) and centres the dialog.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: layers.dialog,
    elevation: layers.dialog,
  },
  window: { width: sizes.dialogWidth, maxWidth: '100%' },
  body: { alignItems: 'center' },
  box: { alignSelf: 'stretch' },
  boxInner: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  rowLabel: { width: sizes.dialogLabelWidth },
  rowValue: { flex: 1 },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  button: { minWidth: sizes.dialogButtonWidth },
  icon: {
    width: icon.size,
    height: icon.size,
    borderRadius: icon.size / 2,
    borderWidth: icon.border,
    borderColor: colors.bevelDark,
    backgroundColor: colors.error,
  },
  // The ✕ strokes, centred inside the border.
  iconBar: {
    position: 'absolute',
    left: (icon.size - 2 * icon.border - icon.crossLength) / 2,
    top: (icon.size - 2 * icon.border - icon.stroke) / 2,
    width: icon.crossLength,
    height: icon.stroke,
    backgroundColor: colors.field,
  },
  iconDown: { transform: [{ rotate: '45deg' }] },
  iconUp: { transform: [{ rotate: '-45deg' }] },
});
