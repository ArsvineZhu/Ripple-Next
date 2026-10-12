import { CopyButton } from '../components/CopyButton';
import styles from './ClipboardTab.module.css';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import { useTranslation } from 'react-i18next';
import type { IslandController } from '../hooks/useIslandController';
type Props = Pick<IslandController, 'clipboard' | 'copyToClipboard'>;
export function ClipboardTab({ clipboard, copyToClipboard }: Props) {
  const { t } = useTranslation();
  return (
    <ElasticScrollArea
      className={styles.container}
      id="clipboard"
      data-empty={clipboard.length === 0 || undefined}
    >
      {clipboard.length === 0 ? (
        <p className={styles.emptyState}>{t('clipboardEmpty')}</p>
      ) : (
        clipboard.map((item, index) => (
          <div className={styles.row} data-island-interactive key={index}>
            <p className={styles.entryContent}>{item}</p>
            <CopyButton className={styles.copyButton} onCopy={() => copyToClipboard(item)} />
          </div>
        ))
      )}
    </ElasticScrollArea>
  );
}
