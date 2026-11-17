import { fireEvent, render, screen } from '@testing-library/react-native';

import { StyleSheet } from 'react-native';

import { strings } from '@/constants/strings';
import { tones } from '@/theme';

import { ConfirmWindow } from './ConfirmWindow';

const { minimize, maximize, close } = strings.ui.titleBar;

function renderUpload(onYes = jest.fn(), onNo = jest.fn(), noDisabled = true) {
  return render(
    <ConfirmWindow
      title="Upload"
      prompt="Do you want to upload?"
      primary={{ label: 'Yes', onPress: onYes }}
      secondary={{ label: 'No', onPress: onNo, disabled: noDisabled }}
      testID="c"
    />,
  );
}

test('shows the title and the prompt', async () => {
  await renderUpload();
  expect(screen.getByText('Upload')).toBeTruthy();
  expect(screen.getByText('Do you want to upload?')).toBeTruthy();
});

test('the primary button calls its handler', async () => {
  const onYes = jest.fn();
  await renderUpload(onYes);
  await fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
  expect(onYes).toHaveBeenCalledTimes(1);
});

test('a disabled button is greyed and ignores presses', async () => {
  const onNo = jest.fn();
  await renderUpload(jest.fn(), onNo, true);
  const no = screen.getByRole('button', { name: 'No' });
  expect(no.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(no);
  expect(onNo).not.toHaveBeenCalled();
});

test('an enabled secondary button calls its handler', async () => {
  const onNo = jest.fn();
  await renderUpload(jest.fn(), onNo, false);
  await fireEvent.press(screen.getByRole('button', { name: 'No' }));
  expect(onNo).toHaveBeenCalledTimes(1);
});

test("can't be closed: every title-bar button is disabled", async () => {
  await renderUpload();
  for (const name of [minimize, maximize, close]) {
    expect(screen.getByRole('button', { name }).props.accessibilityState).toMatchObject({ disabled: true });
  }
});

test('a note shows under the prompt, muted', async () => {
  await render(
    <ConfirmWindow
      title="Back"
      prompt="Back to home screen?"
      note="Failed items will be removed."
      primary={{ label: 'Confirm', onPress: jest.fn() }}
      secondary={{ label: 'Cancel', onPress: jest.fn(), disabled: true }}
    />,
  );
  const note = screen.getByText('Failed items will be removed.');
  expect(StyleSheet.flatten(note.props.style).color).toBe(tones.muted);
});

test('no note unless given', async () => {
  await renderUpload();
  expect(screen.queryByText('Failed items will be removed.')).toBeNull();
});
