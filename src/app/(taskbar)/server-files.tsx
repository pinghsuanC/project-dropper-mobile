// Server files, "Server status" (context/details/1070): the files this phone sent that the PC
// hasn't downloaded yet, from GET /files/sent, with search, loading and failure looks, and
// Back to Home. A testing-menu state shows a mock list instead of calling the server.
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getSentFiles } from '@/api/files';
import type { SentFile } from '@/api/types';
import { mockSentFiles } from '@/components/dev/mockSentFiles';
import { Button, FileList, Gif, Icon, TextField, Window, type FileRow } from '@/components/ui';
import { ServerFilesState } from '@/constants/screenStates';
import { strings } from '@/constants/strings';
import { useScreenState } from '@/lib/screenState';
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

  const retry = useCallback(async () => {
    setLoaded({ kind: 'loading' });
    try {
      setLoaded({ kind: 'loaded', files: await getSentFiles() });
    } catch {
      setLoaded({ kind: 'failed' });
    }
  }, []);

  // A testing-menu state shows its mock list; the mock's times follow the clock.
  const load: Load = testState
    ? { kind: 'loaded', files: testState === ServerFilesState.FILES ? mockSentFiles(now) : [] }
    : loaded;

  const files = load.kind === 'loaded' ? load.files : [];
  const search = query.trim().toLowerCase();
  const rows = files.filter((file) => file.file_name.toLowerCase().includes(search)).map(toRow);

  const emptyText =
    load.kind === 'loading'
      ? s.loading
      : load.kind === 'failed'
        ? s.loadError
        : files.length === 0
          ? s.empty
          : s.noMatch(query.trim());

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
      </Window>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
});
