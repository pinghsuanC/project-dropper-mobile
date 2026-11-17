import { act, render, screen } from '@testing-library/react-native';

import { motion, sizes } from '@/theme';

import { ProgressBar } from './ProgressBar';

/** The filled blocks; each testID ends in its slot number. */
const filled = () => screen.queryAllByTestId(/^p-filled-/, { includeHiddenElements: true });
const slots = () => filled().map((b) => b.props.testID);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('is a progress bar for screen readers', async () => {
  await render(<ProgressBar testID="p" />);
  expect(screen.getByRole('progressbar')).toBeTruthy();
});

test('a value fills its share of the blocks and is announced', async () => {
  await render(<ProgressBar value={0.5} testID="p" />);
  expect(filled()).toHaveLength(sizes.progressBar.blocks / 2);
  expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50 });
});

test('the value is kept between 0 and 1', async () => {
  const { rerender } = await render(<ProgressBar value={2} testID="p" />);
  expect(filled()).toHaveLength(sizes.progressBar.blocks);
  await rerender(<ProgressBar value={-1} testID="p" />);
  expect(filled()).toHaveLength(0);
});

test('with no value it is indeterminate: a short run of blocks that moves', async () => {
  await render(<ProgressBar testID="p" />);
  expect(filled()).toHaveLength(sizes.progressBar.run);
  const before = slots();
  await act(async () => {
    jest.advanceTimersByTime(motion.progressStepMs);
  });
  expect(filled()).toHaveLength(sizes.progressBar.run);
  expect(slots()).not.toEqual(before);
});

test('mini is shorter than default', async () => {
  const { rerender } = await render(<ProgressBar testID="p" />);
  const tall = screen.getByTestId('p').props.style;
  await rerender(<ProgressBar size="mini" testID="p" />);
  expect(screen.getByTestId('p').props.style).not.toEqual(tall);
});
