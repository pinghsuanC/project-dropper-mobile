import { Placeholder } from '@/components/Placeholder';
import { PairingWaitState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { useScreenState } from '@/lib/screenState';

// Step 2: waiting for the server. The error is a state of this screen.
export default function PairingWait() {
  const state = useScreenState(PairingWaitState);
  return (
    <Placeholder
      state={state}
      title={strings.pairing.waitTitle}
      links={[{ label: strings.pairing.toHome, href: '/home' }]}
    />
  );
}
