import { Text } from 'react-native';

import { Placeholder } from '@/components/Placeholder';
import { strings } from '@/constants/strings';
import { useSession } from '@/state/session';

export default function Home() {
  const pairedWith = useSession((s) => s.pairedWith);

  return (
    <Placeholder
      title={strings.home.title}
      links={[
        { label: strings.home.toPairing, href: '/pairing/scan' },
        { label: strings.home.toServerFiles, href: '/server-files' },
        { label: strings.home.toUpload, href: '/upload' },
      ]}
    >
      <Text>{pairedWith ? strings.home.paired(pairedWith.pcName) : strings.home.unpaired}</Text>
    </Placeholder>
  );
}
