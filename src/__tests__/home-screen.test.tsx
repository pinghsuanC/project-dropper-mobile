// Sanity test: proves the CI test job really runs Jest with the jest-expo preset,
// TypeScript and the @/ alias. Replace it once real screens have their own tests.
import { render, screen } from '@testing-library/react-native';

import Home from '@/app/index';

test('home screen renders the app title', async () => {
  await render(<Home />);
  expect(screen.getByText('Project Dropper Mobile')).toBeTruthy();
});
