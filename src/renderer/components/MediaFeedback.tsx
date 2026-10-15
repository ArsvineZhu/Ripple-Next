import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { MediaError } from '../../shared/media';
import { Feedback } from './content';
import styles from './MediaFeedback.module.css';

/** Feedback occupies its own band, never the track's flex layout. */
export function MediaFeedback({
  error,
  compact = false,
}: {
  error: MediaError | null;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={`${styles.band} ${compact ? styles.compact : ''}`} data-media-feedback>
      <AnimatePresence>
        {error && (
          <Feedback key={error} className={styles.message}>
            {t(error)}
          </Feedback>
        )}
      </AnimatePresence>
    </div>
  );
}
