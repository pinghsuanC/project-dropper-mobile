import { Placeholder } from '@/components/Placeholder';
import { strings } from '@/constants/strings';

// Step 2: waiting for the server. The error is a state of this screen.
export default function PairingWait() {
  return (
    <Placeholder
      title={strings.pairing.waitTitle}
      links={[{ label: strings.pairing.toHome, href: '/home' }]}
    />
  );
}
