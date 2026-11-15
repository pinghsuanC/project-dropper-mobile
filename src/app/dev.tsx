// Testing menu (context/details/1020). Only in local and dev builds; prod sends you to Landing.
import { Redirect } from 'expo-router';

import { DevMenu } from '@/components/dev/DevMenu';
import { SHOW_TESTING_MENU } from '@/constants/config';

export default function Dev() {
  if (!SHOW_TESTING_MENU) return <Redirect href="/" />;
  return <DevMenu />;
}
