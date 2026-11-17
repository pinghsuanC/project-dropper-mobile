// ListBox (2010): a sunken white scrolling list of rows, or a line of text when it's empty.
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ListBox } from './ListBox';

type Item = { id: string; label: string };
const ITEMS: Item[] = [
  { id: 'a', label: 'First' },
  { id: 'b', label: 'Second' },
];
const keyOf = (item: Item) => item.id;
const row = (item: Item) => <Text>{item.label}</Text>;

async function show(items: Item[] = ITEMS) {
  await render(<ListBox items={items} keyOf={keyOf} renderRow={row} emptyText="Nothing" testID="list" />);
}

it('renders a row per item, in order', async () => {
  await show();
  expect(screen.getAllByText(/First|Second/).map((n) => n.props.children)).toEqual(['First', 'Second']);
  expect(screen.queryByText('Nothing')).toBeNull();
});

it('works without a testID', async () => {
  await render(<ListBox items={ITEMS} keyOf={keyOf} renderRow={row} emptyText="Nothing" />);
  expect(screen.getByText('First')).toBeTruthy();
  expect(screen.queryByTestId('undefined-field')).toBeNull();
});

it('shows emptyText when there are no items', async () => {
  await show([]);
  expect(screen.getByText('Nothing')).toBeTruthy();
});

it('sits in a sunken white field', async () => {
  await show();
  expect(screen.getByTestId('list-field')).toBeTruthy();
  expect(screen.getByTestId('list-field-inner')).toBeTruthy();
});

// Checked on the prop: getByRole only finds `accessible` elements, and making the list
// accessible would merge its rows into one screen-reader stop.
it('is a list for screen readers, with each row its own stop', async () => {
  await show();
  expect(screen.getByTestId('list').props.accessibilityRole).toBe('list');
  expect(screen.getByTestId('list').props.accessible).not.toBe(true);
});
