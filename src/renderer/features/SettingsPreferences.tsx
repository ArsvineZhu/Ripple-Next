import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './SettingsTab.module.css';

export function PrefGroup({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <div className={styles.prefGroupBlock}>
      {caption && <h3 className={styles.prefGroupCaption}>{caption}</h3>}
      <div className={styles.prefGroup}>{children}</div>
    </div>
  );
}
export function PrefCard({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <div className={styles.prefGroupBlock}>
      {caption && <h3 className={styles.prefGroupCaption}>{caption}</h3>}
      <div className={styles.prefCard}>{children}</div>
    </div>
  );
}
export function PrefRow({
  label,
  hint,
  children,
  stacked = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  stacked?: boolean;
}) {
  return (
    <div className={`${styles.prefRow} ${stacked ? styles.prefRowStacked : ''}`}>
      <div className={styles.prefRowText}>
        <span className={styles.prefRowLabel}>{label}</span>
        {hint && <p className={styles.prefRowHint}>{hint}</p>}
      </div>
      <div className={styles.prefRowControl}>{children}</div>
    </div>
  );
}
export function PreferenceLink({
  label,
  value,
  hint,
  entry,
  onClick,
}: {
  label: string;
  value?: string;
  hint?: string;
  entry: string;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      className={`${styles.prefRow} ${styles.detailLink}`}
      onClick={onClick}
      data-settings-entry={entry}
      data-island-interactive
    >
      <span className={styles.prefRowText}>
        <span className={styles.prefRowLabel}>{label}</span>
        {hint && <span className={styles.prefRowHint}>{hint}</span>}
      </span>
      <span className={styles.linkValue}>{value}</span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  );
}
