import { Placeholder } from '@/components/Placeholder';
import { RegisterState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { useScreenState } from '@/lib/screenState';

export default function Register() {
  const state = useScreenState(RegisterState);
  return (
    <Placeholder
      state={state}
      title={strings.register.title}
      links={[{ label: strings.register.toHome, href: '/home' }]}
    />
  );
}
