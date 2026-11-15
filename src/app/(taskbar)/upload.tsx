import { Placeholder } from '@/components/Placeholder';
import { UploadState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { useScreenState } from '@/lib/screenState';

export default function Upload() {
  const state = useScreenState(UploadState);
  return <Placeholder state={state} title={strings.upload.title} />;
}
