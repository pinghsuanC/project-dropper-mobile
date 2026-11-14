// Every shared UI component (2010). Screens import from '@/components/ui'; files inside ui/
// import each other by path to avoid import loops through this index.
export { Bevel, type BevelKind } from './primitives/Bevel';
export { Text } from './primitives/Text';

export { Button, type ButtonVariant } from './controls/Button';
export { Gif, type GifSize } from './controls/Gif';
export { TitleBar } from './controls/TitleBar';
export { Window } from './controls/Window';

export { ResultPopup } from './patterns/ResultPopup';
export { Terminal } from './patterns/Terminal';
