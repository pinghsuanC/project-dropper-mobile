import { Placeholder } from '@/components/Placeholder';
import { ServerFilesState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { useScreenState } from '@/lib/screenState';

export default function ServerFiles() {
  const state = useScreenState(ServerFilesState);
  return <Placeholder state={state} title={strings.serverFiles.title} />;
}
