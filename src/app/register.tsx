import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Dialog, Gif, Text, TextField, Window } from '@/components/ui';
import { NAME_MAX_LENGTH, REGISTERED_REDIRECT_MS } from '@/constants/config';
import { RegisterState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { cleanName } from '@/lib/names';
import { registerPhone, validateNames, type RegisterStep } from '@/lib/register';
import { useScreenState } from '@/lib/screenState';
import { sizes, spacing, type TextTone } from '@/theme';

// Register (context/details/1050): two names, then lib/register makes or reuses the key,
// registers, saves and logs in. Registered → Home; a failed log-in after saving → Landing,
// which logs in again; an error → a Dialog, and the form can be sent again.

const t = strings.register;

/** The line under the button. */
type Status = { text: string; tone: TextTone } | null;

type ErrorDialog = { kind: 'unreachable' } | { kind: 'rejected'; code: string | number; details?: string };

const STEP_TEXT: Record<RegisterStep, string> = {
  keys: t.creatingKeys,
  registering: t.registering,
};

/** The dialog a testing-menu state opens with (none in prod: useScreenState is undefined). */
function testDialog(state: RegisterState | undefined): ErrorDialog | null {
  switch (state) {
    case RegisterState.UNREACHABLE:
      return { kind: 'unreachable' };
    case RegisterState.SERVER_ERROR:
      return { kind: 'rejected', code: strings.dev.registerSampleCode, details: strings.dev.registerSampleDetails };
    default:
      return null;
  }
}

export default function Register() {
  const testState = useScreenState(RegisterState);
  const [userName, setUserName] = useState('');
  const [deviceName, setDeviceName] = useState<string>(t.deviceNameDefault);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [dialog, setDialog] = useState<ErrorDialog | null>(() => testDialog(testState));
  const [registered, setRegistered] = useState(false);
  // Set at once, unlike `busy`, which only disables the button after the next render: two
  // quick taps would otherwise start two registrations (two keys on a first launch).
  const running = useRef(false);

  const submit = useCallback(async () => {
    if (running.current) return;
    const names = { userName: userName.trim(), deviceName: deviceName.trim() };
    const problem = validateNames(names);
    if (problem) {
      setStatus({ text: t[problem], tone: 'error' });
      return;
    }

    running.current = true;
    setBusy(true);
    setStatus(null);
    const outcome = await registerPhone(names, (step) => setStatus({ text: STEP_TEXT[step], tone: 'normal' }));
    switch (outcome.kind) {
      case 'registered':
        setStatus({ text: t.registered, tone: 'success' });
        setRegistered(true);
        return;
      case 'loginFailed':
        // Saved already: pressing Register again would re-send the same key (409).
        router.replace('/');
        return;
      case 'unreachable':
        setDialog({ kind: 'unreachable' });
        return;
      case 'rejected':
        setDialog({ kind: 'rejected', code: outcome.status, details: outcome.detail });
        return;
    }
  }, [userName, deviceName]);

  const closeDialog = useCallback(() => {
    setDialog(null);
    running.current = false;
    setBusy(false);
    setStatus(null);
  }, []);

  // "Registered!" stays a moment, then Home; replace so Back can't return to Register.
  useEffect(() => {
    if (!registered) return;
    const timer = setTimeout(() => router.replace('/home'), REGISTERED_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [registered]);

  // While a dialog is open, Android's Back closes it instead of leaving the screen (2010).
  useEffect(() => {
    if (!dialog) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDialog();
      return true;
    });
    return () => subscription.remove();
  }, [dialog, closeDialog]);

  return (
    <View style={styles.screen}>
      <ScrollView
        testID="register-content"
        // While a dialog is open, keep TalkBack inside it (2010 "Dialog and screen readers").
        importantForAccessibility={dialog ? 'no-hide-descendants' : 'auto'}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Gif slot="banner" size="large" testID="register-banner" />
        <Window title={t.title}>
          <Text>{t.intro}</Text>
          <TextField
            label={t.userNameLabel}
            placeholder={t.userNamePlaceholder}
            hint={t.userNameHint}
            value={userName}
            onChangeText={setUserName}
            filter={cleanName}
            maxLength={NAME_MAX_LENGTH}
            editable={!busy}
          />
          <TextField
            label={t.deviceNameLabel}
            hint={t.deviceNameHint}
            value={deviceName}
            onChangeText={setDeviceName}
            filter={cleanName}
            maxLength={NAME_MAX_LENGTH}
            editable={!busy}
          />
          <View style={styles.actions}>
            {/* Start the flow without handing its promise to the press handler. */}
            <Button label={t.submit} variant="large" onPress={() => void submit()} disabled={busy} />
            <View style={styles.status} accessibilityLiveRegion="polite">
              {status ? (
                <Text bold align="center" tone={status.tone}>
                  {status.text}
                </Text>
              ) : null}
            </View>
          </View>
        </Window>
      </ScrollView>
      {dialog ? (
        <Dialog
          kind="error"
          message={dialog.kind === 'unreachable' ? t.unreachable : t.serverError}
          code={dialog.kind === 'rejected' ? dialog.code : undefined}
          details={dialog.kind === 'rejected' ? dialog.details : undefined}
          primary={{ label: t.ok, onPress: closeDialog }}
          testID="register-dialog"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  actions: { alignItems: 'center', gap: spacing.md },
  status: { minHeight: sizes.statusLineHeight, justifyContent: 'center' },
});
