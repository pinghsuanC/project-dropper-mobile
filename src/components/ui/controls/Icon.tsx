// All pictograms (2010), drawn with react-native-svg from the prototype's shapes. They draw in
// `currentColor`, set from the tone, so a disabled button's icon greys out with its label.
// Decorative: the button's label says what it does, so screen readers skip the icon.
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors, sizes, tones, type TextTone } from '@/theme';

export type IconName = 'monitor' | 'globe' | 'retry' | 'gear' | 'search';
export type IconSize = 'default' | 'start';

type Props = {
  name: IconName;
  /** `start`: the taskbar button's smaller size. */
  size?: IconSize;
  tone?: TextTone;
  testID?: string;
};

export function Icon({ name, size = 'default', tone = 'normal', testID }: Props) {
  const px = sizes.icon[size];
  const shape = SHAPES[name];
  return (
    <View
      testID={testID ? `${testID}-wrap` : undefined}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg testID={testID} width={px} height={px} viewBox={shape.viewBox} color={tones[tone]}>
        {shape.draw}
      </Svg>
    </View>
  );
}

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: sizes.icon.stroke } as const;

/** Outline icons use a 24-unit box; the gear is a filled 16-unit pixel shape, as in the prototype. */
const SHAPES: Record<IconName, { viewBox: string; draw: React.ReactNode }> = {
  monitor: {
    viewBox: '0 0 24 24',
    draw: (
      <>
        <Rect x={3} y={4} width={18} height={12} {...line} />
        <Path d="M8 20h8M12 16v4" {...line} />
      </>
    ),
  },
  globe: {
    viewBox: '0 0 24 24',
    draw: (
      <>
        <Circle cx={12} cy={12} r={9} {...line} />
        <Ellipse cx={12} cy={12} rx={4} ry={9} {...line} />
        <Path d="M3 12h18" {...line} />
      </>
    ),
  },
  retry: {
    viewBox: '0 0 24 24',
    draw: (
      <>
        <Path d="M19 12a7 7 0 1 1-2.05-4.95" {...line} />
        <Path d="M19 4v4h-4" {...line} />
      </>
    ),
  },
  search: {
    viewBox: '0 0 24 24',
    draw: (
      <>
        <Circle cx={10} cy={10} r={6} {...line} />
        <Path d="M14.5 14.5L20 20" {...line} />
      </>
    ),
  },
  gear: {
    viewBox: '0 0 16 16',
    draw: (
      <>
        <G fill="currentColor">
          {[0, 45].map((angle) => (
            <G key={angle} rotation={angle} origin="8, 8">
              <Rect x={7} y={0} width={2} height={4} />
              <Rect x={7} y={12} width={2} height={4} />
              <Rect x={0} y={7} width={4} height={2} />
              <Rect x={12} y={7} width={4} height={2} />
            </G>
          ))}
        </G>
        <Circle cx={8} cy={8} r={4.5} fill="currentColor" />
        {/* The hole shows the button face behind it. */}
        <Circle cx={8} cy={8} r={2} fill={colors.face} />
      </>
    ),
  },
};
