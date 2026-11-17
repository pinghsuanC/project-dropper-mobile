// All pictograms (2010), drawn with react-native-svg from the prototype's shapes. Line icons
// draw in `currentColor`, set from the tone, so a disabled button's icon greys out with its
// label. `warning` and `info` keep their own colours (2030 Icons) whatever the tone.
// Decorative: the button's label says what it does, so screen readers skip the icon.
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors, sizes, tones, type TextTone } from '@/theme';

export type IconName = 'monitor' | 'globe' | 'retry' | 'gear' | 'search' | 'camera' | 'warning' | 'info';
export type IconSize = 'default' | 'start' | 'dialog';

type Props = {
  name: IconName;
  /** `start`: the taskbar button's smaller size. `dialog`: a Dialog's icon. */
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
        {typeof shape.draw === 'function' ? shape.draw(testID ? `${testID}-fill` : undefined) : shape.draw}
      </Svg>
    </View>
  );
}

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: sizes.icon.stroke } as const;

/** Outline icons use a 24-unit box; the gear is a filled 16-unit pixel shape, as in the prototype. */
// Coloured icons take the testID for their filled shape, so tests can check its colour.
const SHAPES: Record<IconName, { viewBox: string; draw: React.ReactNode | ((fillID?: string) => React.ReactNode) }> = {
  camera: {
    viewBox: '0 0 24 24',
    draw: (
      <>
        <Rect x={3} y={7} width={18} height={13} {...line} />
        <Path d="M8 7l2-3h4l2 3" {...line} />
        <Circle cx={12} cy={13.5} r={3.5} {...line} />
      </>
    ),
  },
  warning: {
    viewBox: '0 0 24 24',
    draw: (fillID) => (
      <>
        <Path testID={fillID} d="M12 2L23 21H1Z" fill={colors.iconWarning} stroke={colors.bevelDark} strokeWidth={sizes.icon.stroke} />
        <Rect x={11} y={8} width={2} height={7} fill={colors.bevelDark} />
        <Rect x={11} y={17} width={2} height={2} fill={colors.bevelDark} />
      </>
    ),
  },
  info: {
    viewBox: '0 0 24 24',
    draw: (fillID) => (
      <>
        <Circle testID={fillID} cx={12} cy={12} r={10.5} fill={colors.iconInfo} stroke={colors.bevelDark} strokeWidth={sizes.icon.stroke} />
        <Rect x={10.5} y={5.5} width={3} height={3} fill={colors.titleText} />
        <Rect x={10.5} y={10} width={3} height={8} fill={colors.titleText} />
      </>
    ),
  },
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
