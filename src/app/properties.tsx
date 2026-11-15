import { Placeholder } from '@/components/Placeholder';
import { PropertiesState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { useScreenState } from '@/lib/screenState';

export default function Properties() {
  const state = useScreenState(PropertiesState);
  return <Placeholder state={state} title={strings.properties.title} />;
}
