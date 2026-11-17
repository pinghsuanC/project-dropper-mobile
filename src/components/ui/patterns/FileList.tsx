// A ListBox of files (2010), the server variant: each row is the name, cut to FILE_NAME_MAX,
// over a muted "size · type · Uploaded when · status" line (type from the name's extension;
// type and status left out when missing).
// Upload's status variants (Sent ✓, %, Waiting, Failed, Too large) come later.
import { StyleSheet, View } from 'react-native';

import { strings } from '@/constants/strings';
import { fileType, formatSize, formatWhen, trimName } from '@/lib/format';
import { spacing } from '@/theme';

import { ListBox } from '../controls/ListBox';
import { Text } from '../primitives/Text';

/**
 * One file, in the list's own terms (screens map server shapes to it). `createdAt` in Unix
 * seconds; `status` is shown as given (already text from strings.ts).
 */
export type FileRow = { id: string; name: string; size: number; createdAt: number; status?: string };

type Props = {
  files: FileRow[];
  emptyText: string;
  /** "Today" and "Yesterday" are counted from here. */
  now: Date;
  testID?: string;
};

export function FileList({ files, emptyText, now, testID }: Props) {
  return (
    <ListBox
      items={files}
      keyOf={(file) => file.id}
      emptyText={emptyText}
      testID={testID}
      renderRow={(file) => {
        const detail = strings.format.fileDetail({
          size: formatSize(file.size),
          type: fileType(file.name),
          when: formatWhen(file.createdAt, now),
          status: file.status,
        });
        return (
          // One stop for screen readers, with the full name.
          <View accessible accessibilityLabel={strings.format.rowLabel(file.name, detail)} style={styles.row}>
            <Text>{trimName(file.name)}</Text>
            <Text variant="caption" tone="muted">
              {detail}
            </Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xxs },
});
