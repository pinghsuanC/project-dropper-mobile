import { Placeholder } from '@/components/Placeholder';
import { strings } from '@/constants/strings';

export default function Register() {
  return (
    <Placeholder
      title={strings.register.title}
      links={[{ label: strings.register.toHome, href: '/home' }]}
    />
  );
}
