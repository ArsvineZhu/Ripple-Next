import { ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
  icon: Icon,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  stacked?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div className={`${styles.prefRow} ${stacked ? styles.prefRowStacked : ''}`}>
      {Icon && <Icon size={18} className={styles.prefIcon} aria-hidden="true" />}
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
  icon: Icon,
}: {
  label: string;
  value?: string;
  hint?: string;
  entry: string;
  onClick(): void;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      className={`${styles.prefRow} ${styles.detailLink}`}
      onClick={onClick}
      data-settings-entry={entry}
      data-island-interactive
    >
      {Icon && <Icon size={18} className={styles.prefIcon} aria-hidden="true" />}
      <span className={styles.prefRowText}>
        <span className={styles.prefRowLabel}>{label}</span>
        {hint && <span className={styles.prefRowHint}>{hint}</span>}
      </span>
      <span className={styles.linkValue}>{value}</span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  );
}

export function PrefNumberField({
  label,
  value,
  min,
  max,
  onChange,
  step = 1,
  placeholder,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step?: number;
  placeholder?: string;
  onChange(value: number | null): void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== input.current) setDraft(value === null ? '' : String(value));
  }, [value]);
  const validNumber = (number: number) =>
    Number.isFinite(number) &&
    number >= min &&
    number <= max &&
    (step < 1 || Number.isInteger(number));
  const valid = draft === '' || validNumber(Number(draft));
  const change = (text: string) => {
    setDraft(text);
    if (text === '') onChange(null);
    else {
      const number = Number(text);
      if (validNumber(number)) onChange(number);
    }
  };
  const advance = (direction: number) => {
    const current = draft !== '' && valid ? Number(draft) : min;
    const precision = 10 ** (String(step).split('.')[1]?.length ?? 0);
    change(
      String(
        Math.min(
          max,
          Math.max(min, Math.round((current + direction * step) * precision) / precision),
        ),
      ),
    );
  };
  return (
    <PrefRow label={label}>
      <div className={styles.numberField} data-number-field aria-invalid={!valid}>
        <input
          ref={input}
          id={id}
          aria-label={label}
          className={styles.numberInput}
          type="number"
          step={step}
          min={min}
          max={max}
          placeholder={placeholder ?? t('providerDefault')}
          value={draft}
          aria-invalid={!valid}
          onChange={(e) => change(e.target.value)}
        />
        <div className={styles.numberSteps}>
          <button
            type="button"
            aria-label={t('increaseValue', { name: label })}
            disabled={draft !== '' && valid && Number(draft) >= max}
            onClick={() => advance(1)}
          >
            <ChevronUp size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t('decreaseValue', { name: label })}
            disabled={draft !== '' && valid && Number(draft) <= min}
            onClick={() => advance(-1)}
          >
            <ChevronDown size={12} aria-hidden="true" />
          </button>
        </div>
      </div>
    </PrefRow>
  );
}
