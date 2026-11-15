// Navy title bar with _ ▫ ✕. A button is enabled only when its handler is passed;
// otherwise it's greyed out and ignores presses (2010). The pictograms are drawn with
// views, not typed: the message font has no □ or ✕, and a fallback font would look off.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, sizes, spacing } from '@/theme';

import { Bevel } from '../primitives/Bevel';
import { Text } from '../primitives/Text';

type Props = {
  title: string;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
};

type GlyphKind = 'minimize' | 'maximize' | 'close';

export function TitleBar({ title, onMinimize, onMaximize, onClose }: Props) {
  const t = strings.ui.titleBar;
  return (
    <View style={styles.bar}>
      <View style={styles.title}>
        <Text variant="title" tone="inverse" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View testID="title-buttons" style={styles.buttons}>
        <TitleButton kind="minimize" label={t.minimize} onPress={onMinimize} />
        <TitleButton kind="maximize" label={t.maximize} onPress={onMaximize} />
        <TitleButton kind="close" label={t.close} onPress={onClose} />
      </View>
    </View>
  );
}

// Grows the tiny title-bar buttons' touch area towards the 44px target.
const HIT_SLOP = (sizes.touchTarget - sizes.titleButtonHeight) / 2;

function TitleButton({ kind, label, onPress }: { kind: GlyphKind; label: string; onPress?: () => void }) {
  const [pressed, setPressed] = useState(false);
  const disabled = !onPress;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={HIT_SLOP}
    >
      <Bevel
        kind={pressed ? 'sunken' : 'raised'}
        style={styles.button}
        innerStyle={styles.buttonInner}
        testID={`title-${kind}`}
      >
        <Glyph kind={kind} disabled={disabled} testID={`title-${kind}-glyph`} />
      </Bevel>
    </Pressable>
  );
}

/** A pictogram; disabled ones are grey with a white copy 1px down-right (engraved). */
function Glyph({ kind, disabled, testID }: { kind: GlyphKind; disabled: boolean; testID: string }) {
  return (
    <View testID={testID} style={styles.glyphBox}>
      {disabled ? (
        <View style={[StyleSheet.absoluteFill, styles.shadowOffset]}>
          <GlyphShape kind={kind} color={colors.disabledShadow} testID={`${testID}-shadow`} />
        </View>
      ) : null}
      <View style={StyleSheet.absoluteFill}>
        <GlyphShape kind={kind} color={disabled ? colors.disabled : colors.text} testID={`${testID}-ink`} />
      </View>
    </View>
  );
}

function GlyphShape({ kind, color, testID }: { kind: GlyphKind; color: string; testID: string }) {
  if (kind === 'minimize') {
    return <View testID={testID} style={[styles.minimize, { backgroundColor: color }]} />;
  }
  if (kind === 'maximize') {
    return <View testID={testID} style={[styles.maximize, { borderColor: color }]} />;
  }
  return (
    <View style={styles.cross}>
      <View testID={testID} style={[styles.crossBar, styles.crossDown, { backgroundColor: color }]} />
      <View style={[styles.crossBar, styles.crossUp, { backgroundColor: color }]} />
    </View>
  );
}

const g = sizes.titleGlyph;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: sizes.titleBarHeight,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    backgroundColor: colors.titleBar,
  },
  title: { flex: 1 },
  // Evenly spaced, as in the prototype.
  buttons: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  button: { width: sizes.titleButtonWidth, height: sizes.titleButtonHeight },
  buttonInner: { alignItems: 'center', justifyContent: 'center' },
  glyphBox: { width: g.width, height: g.height },
  shadowOffset: { left: g.thin, top: g.thin },
  // _ : a short thick bar along the bottom.
  minimize: { position: 'absolute', left: 0, bottom: 0, width: g.minimizeWidth, height: g.stroke },
  // ▫ : a window outline with a thicker top edge.
  maximize: {
    width: g.width,
    height: g.height,
    borderWidth: g.thin,
    borderTopWidth: g.stroke,
  },
  // ✕ : two thick bars crossed at 45°.
  cross: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  crossBar: {
    position: 'absolute',
    left: (g.width - g.crossLength) / 2,
    top: (g.height - g.stroke) / 2,
    width: g.crossLength,
    height: g.stroke,
  },
  crossDown: { transform: [{ rotate: '45deg' }] },
  crossUp: { transform: [{ rotate: '-45deg' }] },
});
