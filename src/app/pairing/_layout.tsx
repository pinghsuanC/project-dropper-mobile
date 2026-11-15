import { Stack } from 'expo-router';

// Pairing's two steps share one stack, so Back from step 2 returns to step 1.
export default function PairingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
