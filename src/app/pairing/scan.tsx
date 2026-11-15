import { Placeholder } from '@/components/Placeholder';
import { PairingScanState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { useScreenState } from '@/lib/screenState';

// Step 1: scan. The camera note, camera and error are states of this screen.
export default function PairingScan() {
  const state = useScreenState(PairingScanState);
  return (
    <Placeholder
      state={state}
      title={strings.pairing.scanTitle}
      links={[{ label: strings.pairing.toWait, href: '/pairing/wait' }]}
    />
  );
}
