// A ListBox of files (2010), in two variants:
// - server (default): each row is the name, cut to FILE_NAME_MAX, over a muted
//   "size · type · Uploaded when · status" line (type from the name's extension; type and
//   status left out when missing).
// - upload: one line per file, name and size, then by status: a ✕ (queued), the percent in a
//   fixed-width box (sending), "Waiting", or "Failed" in the error tone.
import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/constants/strings';
import { fileType, formatSize, formatWhen, trimName } from '@/lib/format';
import { sizes, spacing } from '@/theme';

import { Icon } from '../controls/Icon';
import { ListBox } from '../controls/ListBox';
import { Text } from '../primitives/Text';

/**
 * One file, in the list's own terms (screens map server shapes to it). `createdAt` in Unix
 * seconds; `status` is shown as given (already text from strings.ts).
 */
export type FileRow = { id: string; name: string; size: number; createdAt: number; status?: string };

/** One file in the upload queue. `progress` (0–1) is shown while `sending`. */
export type UploadRow = {
  id: string;
  name: string;
  size: number;
  status: 'queued' | 'waiting' | 'sending' | 'failed';
  progress?: number;
};

type Common = { emptyText: string; testID?: string };
type ServerProps = Common & {
  variant?: 'server';
  files: FileRow[];
  /** "Today" and "Yesterday" are counted from here. */
  now: Date;
};
type UploadProps = Common & {
  variant: 'upload';
  files: UploadRow[];
  /** A queued row's ✕. */
  onRemove: (id: string) => void;
};

export function FileList(props: ServerProps | UploadProps) {
  if (props.variant === 'upload') {
    const { onRemove } = props;
    return (
      <ListBox
        items={props.files}
        keyOf={(file) => file.id}
        emptyText={props.emptyText}
        testID={props.testID}
        renderRow={(file) => <UploadFileRow file={file} onRemove={onRemove} />}
      />
    );
  }
  const { now } = props;
  return (
    <ListBox
      items={props.files}
      keyOf={(file) => file.id}
      emptyText={props.emptyText}
      testID={props.testID}
      renderRow={(file) => {
        const detail = strings.format.fileDetail({
          size: formatSize(file.size),
          type: fileType(file.name),
          when: formatWhen(file.createdAt, now),
          status: file.status,
        });
        return (
          // One stop for screen readers, with the full name.
          <View accessible accessibilityLabel={strings.format.rowLabel(file.name, detail)} style={styles.serverRow}>
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

const u = strings.upload;

function UploadFileRow({ file, onRemove }: { file: UploadRow; onRemove: (id: string) => void }) {
  const size = formatSize(file.size);
  // Rounded down, so 100% shows only once every byte is written.
  const percent = Math.floor((file.progress ?? 0) * 100);
  const statusText =
    file.status === 'sending' ? u.percent(percent) : file.status === 'waiting' ? u.waiting : file.status === 'failed' ? u.failed : undefined;

  return (
    <View style={styles.uploadRow}>
      {/* Name, size and status are one screen-reader stop; the ✕ is its own button. */}
      <View accessible accessibilityLabel={u.rowLabel(file.name, size, statusText)} style={styles.uploadInfo}>
        <View style={styles.name}>
          <Text numberOfLines={1}>{trimName(file.name)}</Text>
        </View>
        <Text tone="muted">{size}</Text>
        {file.status === 'sending' ? (
          // A fixed width, so the size beside it doesn't move as 9% becomes 10% and 100%.
          <View testID="upload-row-percent" style={styles.percent}>
            <Text align="right">{statusText}</Text>
          </View>
        ) : null}
        {file.status === 'waiting' ? <Text tone="muted">{statusText}</Text> : null}
        {file.status === 'failed' ? (
          <Text bold tone="error">
            {statusText}
          </Text>
        ) : null}
      </View>
      {file.status === 'queued' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={u.remove(file.name)}
          onPress={() => onRemove(file.id)}
          hitSlop={(sizes.touchTarget - sizes.icon.start) / 2}
          style={styles.remove}
        >
          <Icon name="close" size="start" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  serverRow: { gap: spacing.xxs },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  uploadInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { flex: 1 },
  percent: { width: sizes.uploadRowPercent },
  remove: { padding: spacing.xs },
});
