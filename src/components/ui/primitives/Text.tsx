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
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', tone = 'normal', bold, align, ...rest }: Props) {
  const role = type[variant];
  const style: TextStyle = {
    ...role,
    color: tones[tone],
    ...(bold && role.fontFamily === fonts.message ? { fontFamily: fonts.messageBold } : null),
    ...(tone === 'disabled' ? disabledTextShadow : null),
    ...(align ? { textAlign: align } : null),
  };
  return <RNText maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} style={style} />;
}
