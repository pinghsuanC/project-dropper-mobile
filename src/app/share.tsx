import { Placeholder } from '@/components/Placeholder';
import { ShareState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { useScreenState } from '@/lib/screenState';

// Shared file to PC. Loading and error are states of this screen. Nothing opens it yet:
// the Android share intent comes with the Sharing feature.
export default function Share() {
  const state = useScreenState(ShareState);
  return <Placeholder state={state} title={strings.share.title} />;
}
