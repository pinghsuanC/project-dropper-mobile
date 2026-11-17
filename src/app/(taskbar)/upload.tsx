// Upload, "Pending upload" (context/details/1090): a queue of picked files, with search, ✕
// and Clear all, files over MAX_UPLOAD_BYTES turned away when picked, a status bar with the
// connection (Home's check), and the Back window. Laid out like Server status (1070).
// Part 1 of the upload feature: Upload stays disabled until sending is built (Part 2); the
// sending, failed and result looks open from the testing menu with a mock queue.
import { getDocumentAsync } from 'expo-document-picker';
import { router } from 'expo-router';
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
import { addPicked, filterQueue, pickProblem, removeFile, type QueuedFile, type UploadPopup } from '@/lib/uploadQueue';
import { useNow } from '@/lib/useNow';
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
  const [queue, setQueue] = useState<QueuedFile[]>(first?.queue ?? []);
  const [popup, setPopup] = useState<UploadPopup | null>(first?.popup ?? null);
  const [connection, setConnection] = useState<Connection>(first ? 'paired' : 'checking');
  const [query, setQuery] = useState('');
  const sending = first?.sending ?? null;
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

  const closePopup = useCallback(() => setPopup(null), []);

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
      const result = await getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const added = addPicked(queue, result.assets);
      setQueue(added.queue);
      setPopup(pickProblem(added));
    } catch {
      setPopup({ kind: 'error', message: u.pickError });
    }
  };

  const rows = filterQueue(queue, query);
  const emptyText = queue.length === 0 ? u.empty : u.noMatch(query.trim());
  const status: StatusSegment[] = [
    { text: CONNECTION_TEXT[connection], dot: connection === 'paired' },
    { text: sending ? u.sendingCount(sending.current, sending.total) : u.fileCount(queue.length) },
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
          <View style={styles.buttons}>
            <Button label={u.clearAll} onPress={() => setQueue([])} disabled={queue.length === 0 || !!sending} />
            <View style={styles.spacer} />
            <Button
              label={u.add}
              icon={<Icon name="folder" size="start" tone={sending ? 'disabled' : 'normal'} />}
              onPress={() => void add()}
              disabled={!!sending}
            />
            {/* Sending comes in Part 2; until then Upload is always disabled. */}
            <Button label={sending ? u.sending : u.upload} onPress={() => {}} disabled />
          </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spacer: { flex: 1 },
});
