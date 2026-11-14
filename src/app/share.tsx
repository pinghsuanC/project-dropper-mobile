import { Placeholder } from '@/components/Placeholder';
import { strings } from '@/constants/strings';

// Shared file to PC. Loading and error are states of this screen. Nothing opens it yet:
// the Android share intent comes with the Sharing feature.
export default function Share() {
  return <Placeholder title={strings.share.title} />;
}
