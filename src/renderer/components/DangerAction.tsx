import { useId, useRef, useState, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './DangerAction.module.css';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';

/** Confirm destructive settings changes with a separate, cancellable action. */
export function DangerAction({
  label,
  onConfirm,
  children,
  className = '',
  disabled = false,
}: {
  label: string;
  onConfirm(): unknown | Promise<unknown>;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPreference();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const active = useRef(false);
  const show = () => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    if (!reduced && typeof element.animate === 'function')
      element.animate(
        [
          { opacity: 0, transform: 'translateY(8px) scale(0.96)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 180, easing: 'ease-out' },
      );
  };
  const hide = async () => {
    const element = dialog.current;
    if (!element?.open) return;
    if (!reduced && typeof element.animate === 'function') {
      const style = getComputedStyle(element);
      const first = { opacity: style.opacity, transform: style.transform };
      element.getAnimations().forEach((animation) => animation.cancel());
      await element
        .animate([first, { opacity: 0, transform: 'translateY(6px) scale(0.98)' }], {
          duration: 140,
          easing: 'ease-in',
        })
        .finished.catch(() => {});
    }
    element.close();
  };
  const cancel = async () => {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    try {
      await hide();
    } finally {
      active.current = false;
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    try {
      await hide();
      const result = await onConfirm();
      if (result === false || result === null) {
        setFailed(true);
        show();
      }
    } catch {
      setFailed(true);
      show();
    } finally {
      active.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        className={`${styles.trigger} ${className}`}
        aria-label={label}
        disabled={disabled || busy}
        onClick={() => {
          setFailed(false);
          show();
        }}
      >
        {children ?? <Trash2 size={16} aria-hidden="true" />}
      </button>
      <dialog
        role="alertdialog"
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-action`}
        onCancel={(event) => {
          event.preventDefault();
          void cancel();
        }}
      >
        <h2 id={`${id}-title`}>{t('confirmDangerousAction')}</h2>
        <p id={`${id}-action`}>{label}</p>
        {failed && <p role="alert">{t('confirmationFailed')}</p>}
        <div className={styles.actions}>
          <button type="button" autoFocus disabled={busy} onClick={() => void cancel()}>
            {t('cancelAction')}
          </button>
          <button
            type="button"
            className={styles.confirm}
            disabled={busy}
            onClick={() => void confirm()}
          >
            {t('confirmAction')}
          </button>
        </div>
      </dialog>
    </>
  );
}
