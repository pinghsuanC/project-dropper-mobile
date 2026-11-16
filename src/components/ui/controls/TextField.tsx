// Sunken text input with a label, an optional hint and an `n/max` counter (2010).
// Controlled: the screen keeps the value. Every change runs `filter` first and then the
// length limit, so a paste is cleaned before it's cut. The native `maxLength` is not used:
// it would cut a paste before the filter could drop characters from it.
import { StyleSheet, TextInput, View, type TextStyle } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, maxFontSizeMultiplier, spacing, tones, type } from '@/theme';

import { Bevel } from '../primitives/Bevel';
import { Text } from '../primitives/Text';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Fine print under the field, left. */
  hint?: string;
  /** Most characters the field holds; also shows the `n/max` counter. */
  maxLength?: number;
  /** Cleans every change (typing and paste) before the length limit. */
  filter?: (text: string) => string;
  /** false: greyed text, input ignored (e.g. while submitting). */
  editable?: boolean;
  testID?: string;
};

/** Characters, not UTF-16 units, so 名 or é counts as one. */
const characters = (text: string) => Array.from(text);

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  maxLength,
  filter,
  editable = true,
  testID,
}: Props) {
  const handleChange = (raw: string) => {
    const filtered = filter ? filter(raw) : raw;
    const chars = characters(filtered);
    onChangeText(maxLength !== undefined && chars.length > maxLength ? chars.slice(0, maxLength).join('') : filtered);
  };

  const length = characters(value).length;
  const inputStyle: TextStyle = { ...type.body, color: editable ? tones.normal : tones.disabled };

  return (
    <View style={styles.field} testID={testID}>
      <Text variant="label">{label}</Text>
      <Bevel kind="field" testID={testID ? `${testID}-box` : undefined} innerStyle={styles.box}>
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          editable={editable}
          accessibilityLabel={label}
          accessibilityHint={hint}
          accessibilityState={{ disabled: !editable }}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          style={[styles.input, inputStyle]}
        />
      </Bevel>
      {hint || maxLength !== undefined ? (
        <View style={styles.footer} testID={testID ? `${testID}-footer` : undefined}>
          <View style={styles.hint}>{hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}</View>
          {maxLength !== undefined ? (
            <Text
              variant="caption"
              tone="muted"
              accessibilityLabel={strings.ui.textField.countLabel(length, maxLength)}
            >
              {strings.ui.textField.count(length, maxLength)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  box: { paddingHorizontal: spacing.md },
  input: { paddingVertical: spacing.md, paddingHorizontal: 0 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  hint: { flex: 1 },
});
