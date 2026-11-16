import { Profiler } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, fonts, sizes } from '@/theme';

import { Balloon, steppedOutline } from './Balloon';

const HIDDEN = { includeHiddenElements: true };
const b = sizes.balloon;

const layout = (width: number, height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });

describe('steppedOutline', () => {
  it('steps each corner in by 2px three times, as the prototype clip-path', () => {
    const points = steppedOutline(100, 50, 0).split(' ');
    // Top-left corner, from the left edge to the top edge.
    expect(points.slice(0, 7)).toEqual(['0,6', '2,6', '2,4', '4,4', '4,2', '6,2', '6,0']);
    // Top-right corner.
    expect(points.slice(7, 14)).toEqual(['94,0', '94,2', '96,2', '96,4', '98,4', '98,6', '100,6']);
    expect(points).toHaveLength(28);
  });

  it('an inset outline is the same shape, moved in on every side', () => {
    const points = steppedOutline(100, 50, 2).split(' ');
    expect(points[0]).toBe('2,8');
    expect(points[6]).toBe('8,2');
    expect(points[13]).toBe('98,8');
    expect(points.at(-1)).toBe('2,42');
  });
});

describe('Balloon', () => {
  it('shows the title in bold, the label and the text in italic', async () => {
    await render(<Balloon title="Good afternoon, Alex" label="QUOTE OF THE DAY" text="First, solve the problem." />);
    expect(StyleSheet.flatten(screen.getByText('Good afternoon, Alex').props.style).fontFamily).toBe(fonts.messageBold);
    expect(screen.getByText('QUOTE OF THE DAY')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('First, solve the problem.').props.style).fontFamily).toBe(
      fonts.messageItalic,
    );
  });

  it('the label is optional', async () => {
    await render(<Balloon title="Let's pair!" text="Run the program on your computer." />);
    expect(screen.getByText("Let's pair!")).toBeTruthy();
    expect(screen.queryByText('QUOTE OF THE DAY')).toBeNull();
  });

  it('is read by screen readers as one item', async () => {
    await render(<Balloon title="Hi" text="Quote" testID="b" />);
    expect(screen.getByTestId('b').props.accessible).toBe(true);
  });

  it('draws nothing until its size is known, then a shape that fits the text plus the tail', async () => {
    await render(<Balloon title="Hi" text="Quote" testID="b" />);
    expect(screen.queryByTestId('b-shape', HIDDEN)).toBeNull();
    await fireEvent(screen.getByTestId('b-body'), 'layout', layout(300, 80));
    const shape = screen.getByTestId('b-shape', HIDDEN);
    expect(shape.props.width).toBe(300);
    expect(shape.props.height).toBe(80 + b.tail - b.outline);
  });

  it('outline black, inside the tooltip yellow', async () => {
    await render(<Balloon title="Hi" text="Quote" testID="b" />);
    await fireEvent(screen.getByTestId('b-body'), 'layout', layout(300, 80));
    const json = JSON.stringify(screen.toJSON());
    // react-native-svg's test output encodes colours as ARGB numbers.
    const argb = (hex: string) => (0xff000000 + parseInt(hex.slice(1), 16)) >>> 0;
    const count = (hex: string) => json.split(`"payload":${argb(hex)}`).length - 1;
    // Body and tail each: a black shape with a yellow one inside it. (The SVG's root group also
    // carries react-native-svg's default black fill, so black is counted as "at least".)
    expect(count(colors.bevelDark)).toBeGreaterThanOrEqual(2);
    expect(count(colors.tooltip)).toBe(2);
  });

  it('is announced as text', async () => {
    await render(<Balloon title="Hi" text="Quote" testID="b" />);
    expect(screen.getByTestId('b').props.accessibilityRole).toBe('text');
  });

  it('a layout at the same size does not redraw; a new size does', async () => {
    const onRender = jest.fn();
    await render(
      <Profiler id="balloon" onRender={onRender}>
        <Balloon title="Hi" text="Quote" testID="b" />
      </Profiler>,
    );
    const body = screen.getByTestId('b-body');
    await fireEvent(body, 'layout', layout(300, 80));
    const afterFirst = onRender.mock.calls.length;
    for (let i = 0; i < 3; i++) await fireEvent(body, 'layout', layout(300, 80));
    // React may render once more before it sees the state is unchanged and bails out; it must
    // not redraw on every layout pass (without the check, each of the three would).
    const afterRepeats = onRender.mock.calls.length;
    expect(afterRepeats - afterFirst).toBeLessThanOrEqual(1);
    await fireEvent(body, 'layout', layout(320, 80));
    expect(onRender.mock.calls.length).toBeGreaterThan(afterRepeats);
    expect(screen.getByTestId('b-shape', HIDDEN).props.width).toBe(320);
  });

  it('leaves room below for the tail', async () => {
    await render(<Balloon title="Hi" text="Quote" testID="b" />);
    expect(StyleSheet.flatten(screen.getByTestId('b').props.style).paddingBottom).toBe(b.tail - b.outline);
  });
});
