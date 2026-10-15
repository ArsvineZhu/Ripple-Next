import { ActionButton } from './content';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CopyButton.module.css';
export function CopyButton({
  onCopy,
  className = '',
}: {
  onCopy: () => void | Promise<void>;
  className?: string;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'copy' | 'copied' | 'copyFailed'>('copy');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <ActionButton
      tone="secondary"
      size="small"
      className={`${styles.button} ${className}`}
      data-copied={status === 'copied'}
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await onCopy();
          setStatus('copied');
        } catch {
          setStatus('copyFailed');
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setStatus('copy'), 2000);
      }}
    >
      {t(status)}
    </ActionButton>
  );
}
