import { Placeholder } from '@/components/Placeholder';
import { strings } from '@/constants/strings';

// Step 1: scan. The camera note, camera and error are states of this screen.
export default function PairingScan() {
  return (
    <Placeholder
      title={strings.pairing.scanTitle}
      links={[{ label: strings.pairing.toWait, href: '/pairing/wait' }]}
    />
  );
}
