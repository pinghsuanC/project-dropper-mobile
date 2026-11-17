// All text. Styled by role (`variant`) and colour (`tone`), never per screen (2020).
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import {
  disabledTextShadow,
  fonts,
  maxFontSizeMultiplier,
  tones,
  type,
  type TextTone,
  type TextVariant,
} from '@/theme';

type Props = Omit<TextProps, 'style'> & {
  variant?: TextVariant;
  tone?: TextTone;
  /** Bold face of the message font (body, label, caption). */
  bold?: boolean;
  /** Italic face of the message font (a real italic file; no bold italic is loaded, so bold wins). */
  italic?: boolean;
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', tone = 'normal', bold, italic, align, ...rest }: Props) {
  const role = type[variant];
  const messageFont = role.fontFamily === fonts.message;
  const style: TextStyle = {
    ...role,
    color: tones[tone],
    ...(italic && messageFont && !bold ? { fontFamily: fonts.messageItalic } : null),
    ...(bold && messageFont ? { fontFamily: fonts.messageBold } : null),
    ...(tone === 'disabled' ? disabledTextShadow : null),
    ...(align ? { textAlign: align } : null),
  };
  return <RNText maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} style={style} />;
}
