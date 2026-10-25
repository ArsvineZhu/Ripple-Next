import { EmptyState, Feedback, Surface } from '../components/content';
import { CopyButton } from '../components/CopyButton';
import styles from './ClipboardTab.module.css';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import { useTranslation } from 'react-i18next';
import type { useClipboard } from '../hooks/useClipboard';
type Props = ReturnType<typeof useClipboard>;
export function ClipboardTab({ clipboard, clipboardReadFailed, copyToClipboard }: Props) {
  const { t } = useTranslation();
  return (
    <ElasticScrollArea
      className={styles.container}
      id="clipboard"
      data-empty={(clipboard.length === 0 && !clipboardReadFailed) || undefined}
    >
      {clipboardReadFailed && <Feedback>{t('clipboardReadFailed')}</Feedback>}
      {clipboard.length === 0 && !clipboardReadFailed ? (
        <EmptyState prominent className={styles.emptyState}>
          {t('clipboardEmpty')}
        </EmptyState>
      ) : (
        clipboard.map((item, index) => (
          <Surface className={styles.row} interactive key={index}>
            <p className={styles.entryContent}>{item}</p>
            <CopyButton className={styles.copyButton} onCopy={() => copyToClipboard(item)} />
          </Surface>
        ))
      )}
    </ElasticScrollArea>
  );
}
