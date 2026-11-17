import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { fonts } from '@/theme';

import { Notice } from './Notice';

const HIDDEN = { includeHiddenElements: true };

test('shows its text in bold', async () => {
  await render(<Notice text="Don't share the QR code with anyone." />);
  const text = screen.getByText("Don't share the QR code with anyone.");
  expect(StyleSheet.flatten(text.props.style).fontFamily).toBe(fonts.messageBold);
});

test('shows a warning icon by default', async () => {
  await render(<Notice text="t" testID="n" />);
  expect(screen.getByTestId('n-icon', HIDDEN)).toBeTruthy();
});
