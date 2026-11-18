// Upload, "Pending upload" (context/details/1090): a queue of picked files, with search, ✕
// and Clear all, files over MAX_UPLOAD_BYTES turned away when picked, a status bar with the
// connection (Home's check), and the Back window. Laid out like Server status (1070).
// The queue, the running send and its outcome live in the session store, and `sendQueue()`
// runs outside React, so a send carries on when the user leaves. Files a send didn't get through
// stay Failed, with Retry failed in Upload's place, until the user leaves the screen. A
// testing-menu look works on its own mock queue and never touches the store.
import { getDocumentAsync } from 'expo-document-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import { mockUploadLook } from '@/components/dev/mockUploadQueue';
import {
  Button,
  ConfirmWindow,
  Dialog,
  FileList,
  Gif,
  Icon,
  ProgressBar,
  StatusBar,
  TextField,
  Window,
  type StatusSegment,
} from '@/components/ui';
import { UploadState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { formatTime } from '@/lib/format';
import { checkConnection, type ConnectionResult } from '@/lib/homeCheck';
import { useScreenState } from '@/lib/screenState';
import { sendQueue } from '@/lib/sendQueue';
import {
  addPicked,
  dropFailed,
  filterQueue,
  outcomePopup,
  pickProblem,
  removeFile,
  type QueuedFile,
  type UploadPopup,
} from '@/lib/uploadQueue';
import { useNow } from '@/lib/useNow';
import { getSession, useSession, type UploadSending } from '@/state/session';
import { spacing } from '@/theme';

const u = strings.upload;

type Connection = 'checking' | ConnectionResult;

const CONNECTION_TEXT: Record<Connection, string> = {
  checking: u.checking,
  paired: u.connected,
  unpaired: u.notConnected,
  serverError: u.serverError,
};

const goHome = () => router.dismissTo('/home');

export default function Upload() {
  const testState = useScreenState(UploadState);
  // A testing-menu state sets the first look (mock queue, sending, popup); it works from there.
  const [first] = useState(() => (testState ? mockUploadLook(testState) : null));
  const [mockQueue, setMockQueue] = useState<QueuedFile[]>(first?.queue ?? []);
  const storeQueue = useSession((s) => s.uploadQueue);
  const storeSending = useSession((s) => s.uploadSending);
  const outcome = useSession((s) => s.uploadOutcome);
  const queue = first ? mockQueue : storeQueue;
  const setQueue = first ? setMockQueue : getSession().setUploadQueue;
  const sending = first ? first.sending : storeSending;
  // A pick problem or a look's popup first; otherwise how the last send ended.
  const [pickPopup, setPickPopup] = useState<UploadPopup | null>(first?.popup ?? null);
  const popup = pickPopup ?? (outcome && !first ? outcomePopup(outcome) : null);
  const [connection, setConnection] = useState<Connection>(first ? 'paired' : 'checking');
  const [query, setQuery] = useState('');
  const now = useNow();

  // Check the server and the paired PC once when the screen opens, as Home does; a testing-menu
  // look skips it. The result is dropped if the screen has closed meanwhile.
  useEffect(() => {
    if (testState) return;
    let current = true;
    void checkConnection().then((result) => {
      if (current) setConnection(result);
    });
    return () => {
      current = false;
    };
  }, [testState]);

  // Leaving the screen (Confirm, ✕, the taskbar, Android Back) drops failed files; a running
  // send's waiting and sending files stay (the Back note). A look never touches the store.
  useFocusEffect(
    useCallback(() => {
      if (first) return;
      return () => {
        const session = getSession();
        session.setUploadQueue(dropFailed);
        // "Please retry" would come back over files that are gone; "all sent" is still true.
        if (session.uploadOutcome?.kind === 'partial') session.setUploadOutcome(null);
      };
    }, [first]),
  );

  const closePopup = useCallback(() => {
    // No pick popup open: the one showing is the send's outcome.
    if (pickPopup) setPickPopup(null);
    else getSession().setUploadOutcome(null);
  }, [pickPopup]);

  // Android Back closes a popup first (Dialog notes, 2010).
  useEffect(() => {
    if (!popup) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closePopup();
      return true;
    });
    return () => sub.remove();
  }, [popup, closePopup]);

  const add = async () => {
    try {
      // The picker's own content:// links, not cache copies: in Expo Go, expo-file-system can't
      // read the picker's cache copy ("Missing 'READ' permission"), but it reads these (1090).
      const result = await getDocumentAsync({ multiple: true, copyToCacheDirectory: false });
      if (result.canceled) return;
      const added = addPicked(queue, result.assets);
      setQueue(added.queue);
      setPickPopup(pickProblem(added));
    } catch {
      setPickPopup({ kind: 'error', message: u.pickError });
    }
  };

  const connected = !first && connection === 'paired';
  const canUpload = connected && !sending && queue.some((file) => file.status === 'queued');
  // Files a send didn't get through: Retry failed is the only action (the prototype's partial mode).
  const hasFailed = !sending && queue.some((file) => file.status === 'failed');

  const rows = filterQueue(queue, query);
  const emptyText = queue.length === 0 ? u.empty : u.noMatch(query.trim());
  const status: StatusSegment[] = [
    { text: CONNECTION_TEXT[connection], dot: connection === 'paired' },
    { text: sendingText(sending) ?? u.fileCount(queue.length) },
    { text: formatTime(now) },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        testID="upload-content"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        // While a popup is open, TalkBack must stay in it (Dialog notes, 2010).
        importantForAccessibility={popup ? 'no-hide-descendants' : 'auto'}
      >
        <Gif slot="banner" size="large" testID="upload-gif" />
        <Window title={u.title} onClose={goHome}>
          {sending ? (
            <Gif slot="sending" size="small" testID="upload-sending-gif" />
          ) : (
            <TextField
              label={u.search}
              labelHidden
              placeholder={u.search}
              value={query}
              onChangeText={setQuery}
              icon={<Icon name="search" size="start" />}
            />
          )}
          <FileList
            variant="upload"
            files={rows}
            onRemove={(id) => setQueue((q) => removeFile(q, id))}
            emptyText={emptyText}
            testID="upload-list"
          />
          {sending ? (
            <View testID="upload-running">
              <ProgressBar />
            </View>
          ) : null}
          {hasFailed ? (
            <View style={styles.buttons}>
              <View style={styles.spacer} />
              <Button label={u.retryFailed} onPress={() => void sendQueue('failed')} disabled={!connected} />
            </View>
          ) : (
            <View style={styles.buttons}>
              <Button label={u.clearAll} onPress={() => setQueue([])} disabled={queue.length === 0 || !!sending} />
              <View style={styles.spacer} />
              <Button
                label={u.add}
                icon={<Icon name="folder" size="start" tone={sending ? 'disabled' : 'normal'} />}
                onPress={() => void add()}
                disabled={!!sending}
              />
              <Button label={sending ? u.sending : u.upload} onPress={() => void sendQueue()} disabled={!canUpload} />
            </View>
          )}
          <StatusBar segments={status} testID="upload-status" />
        </Window>

        <ConfirmWindow
          title={u.backTitle}
          prompt={u.backPrompt}
          note={u.backNote}
          primary={{ label: u.confirm, onPress: goHome }}
          // Cancel stays disabled, as in the prototype: the window can't be dismissed.
          secondary={{ label: u.cancel, onPress: () => {}, disabled: true }}
        />
      </ScrollView>

      {popup ? (
        <Dialog
          kind={popup.kind}
          title={popup.title}
          heading={popup.heading}
          message={popup.message}
          primary={{ label: u.ok, onPress: closePopup }}
          testID="upload-dialog"
        />
      ) : null}
    </View>
  );
}

/** The status bar's middle segment while sending: preparing (0) or "Sending n of m". */
function sendingText(sending: Pick<UploadSending, 'current' | 'total'> | null): string | null {
  if (!sending) return null;
  return sending.current === 0 ? u.preparing : u.sendingCount(sending.current, sending.total);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spacer: { flex: 1 },
});
