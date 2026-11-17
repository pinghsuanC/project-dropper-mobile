// Sunken white bar filled with navy blocks (2010). With a `value` (0–1) it fills that share;
// without one it's indeterminate: a short run of blocks walks across and wraps around.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, motion, sizes } from '@/theme';

import { Bevel } from '../primitives/Bevel';

type Props = {
  /** 0–1. Leave out while how far along isn't known. */
  value?: number;
  size?: 'default' | 'mini';
  testID?: string;
};

const { blocks, run, gap, height } = sizes.progressBar;
const SLOTS = Array.from({ length: blocks }, (_, i) => i);

export function ProgressBar({ value, size = 'default', testID }: Props) {
  const indeterminate = value === undefined;
  const step = useStep(indeterminate);
  const share = indeterminate ? 0 : Math.min(1, Math.max(0, value));
  const count = Math.round(share * blocks);

  const isFilled = (slot: number) =>
    indeterminate ? (slot - step + blocks) % blocks < run : slot < count;

  return (
    <View
      testID={testID}
      accessible
      style={size === 'mini' ? styles.mini : styles.default}
      accessibilityRole="progressbar"
      accessibilityValue={indeterminate ? undefined : { min: 0, max: 100, now: Math.round(share * 100) }}
    >
      <Bevel kind="field" style={styles.fill} innerStyle={styles.inner}>
        {SLOTS.map((slot) => {
          const filled = isFilled(slot);
          return (
            <View
              key={slot}
              testID={testID ? `${testID}-${filled ? 'filled' : 'empty'}-${slot}` : undefined}
              style={[styles.slot, filled && styles.filled]}
            />
          );
        })}
      </Bevel>
    </View>
  );
}

/** The first filled slot of the indeterminate run, moving one slot every step. */
function useStep(running: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setStep((s) => (s + 1) % blocks), motion.progressStepMs);
    return () => clearInterval(id);
  }, [running]);
  return step;
}

const styles = StyleSheet.create({
  default: { height: height.default },
  mini: { height: height.mini },
  fill: { flex: 1 },
  inner: { flex: 1, flexDirection: 'row', padding: gap, gap },
  slot: { flex: 1 },
  filled: { backgroundColor: colors.titleBar },
});
