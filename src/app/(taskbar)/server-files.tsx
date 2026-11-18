// Server files, "Server status" (context/details/1070): the files this phone sent that the PC
// hasn't downloaded yet, from GET /files/sent, with search, loading and failure looks, and
// Back to Home, and a status bar like Upload's: the connection, the file count and the time.
// A testing-menu state shows a mock list instead of calling the server.
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getSentFiles } from '@/api/files';
import type { SentFile } from '@/api/types';
import { mockSentFiles } from '@/components/dev/mockSentFiles';
import { Button, FileList, Gif, Icon, StatusBar, TextField, Window, type FileRow, type StatusSegment } from '@/components/ui';
import { ServerFilesState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { formatTime } from '@/lib/format';
import { useScreenState } from '@/lib/screenState';
import { matchesName } from '@/lib/search';
import { connectionSegment, useConnection } from '@/lib/useConnection';
import { useNow } from '@/lib/useNow';
import { spacing } from '@/theme';

const s = strings.serverFiles;

type Load = { kind: 'loading' } | { kind: 'failed' } | { kind: 'loaded'; files: SentFile[] };

const toRow = (file: SentFile): FileRow => ({
  id: file.file_id,
  name: file.file_name,
  size: file.size,
  createdAt: file.created_at,
  status: strings.format.fileStatus[file.status],
});

const goHome = () => router.dismissTo('/home');

export default function ServerFiles() {
  const testState = useScreenState(ServerFilesState);
  const now = useNow();
  const [loaded, setLoaded] = useState<Load>({ kind: 'loading' });
  const [query, setQuery] = useState('');
  const { connection, recheck } = useConnection(!!testState);

  // Load once when the screen opens (it starts in 'loading'); dropped if it has closed meanwhile.
  useEffect(() => {
    if (testState) return;
    let current = true;
    getSentFiles().then(
      (files) => current && setLoaded({ kind: 'loaded', files }),
      () => current && setLoaded({ kind: 'failed' }),
    );
    return () => {
      current = false;
    };
  }, [testState]);

  // Retry loads the list and checks the connection again (for the status bar).
  const retry = useCallback(async () => {
    void recheck();
    setLoaded({ kind: 'loading' });
    try {
      setLoaded({ kind: 'loaded', files: await getSentFiles() });
    } catch {
      setLoaded({ kind: 'failed' });
    }
  }, [recheck]);

  // A testing-menu state shows its mock list; the mock's times follow the clock.
  const load: Load = testState
    ? { kind: 'loaded', files: testState === ServerFilesState.FILES ? mockSentFiles(now) : [] }
    : loaded;

  const files = load.kind === 'loaded' ? load.files : [];
  const rows = files.filter((file) => matchesName(file.file_name, query)).map(toRow);

  const emptyText =
    load.kind === 'loading'
      ? s.loading
      : load.kind === 'failed'
        ? s.loadError
        : files.length === 0
          ? s.empty
          : s.noMatch(query.trim());

  // As on Upload: connection · "N files" (once loaded) · the time.
  const status: StatusSegment[] = [
    connectionSegment(connection),
    ...(load.kind === 'loaded' ? [{ text: s.fileCount(files.length) }] : []),
    { text: formatTime(now) },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Gif slot="banner" size="large" testID="server-files-gif" />
      <Window title={s.title} onClose={goHome}>
        <TextField
          label={s.search}
          labelHidden
          placeholder={s.search}
          value={query}
          onChangeText={setQuery}
          icon={<Icon name="search" size="start" />}
        />
        <FileList files={rows} emptyText={emptyText} now={now} testID="server-files-list" />
        <View style={styles.buttons}>
          {load.kind === 'failed' ? <Button label={s.retry} onPress={() => void retry()} /> : null}
          <Button label={s.back} onPress={goHome} />
        </View>
        <StatusBar segments={status} testID="server-files-status" />
      </Window>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
});
