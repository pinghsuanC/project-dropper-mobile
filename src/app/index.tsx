import { Placeholder } from '@/components/Placeholder';
import { strings } from '@/constants/strings';

// Landing: later runs the start-up order (1010) and moves on with router.replace.
export default function Landing() {
  return (
    <Placeholder
      title={strings.landing.title}
      links={[
        { label: strings.landing.toHome, href: '/home' },
        { label: strings.landing.toRegister, href: '/register' },
      ]}
    />
  );
}
