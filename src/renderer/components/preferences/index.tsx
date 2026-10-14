import {
  Type,
  MapPin,
  CloudSun,
  Search,
  Image,
  AppWindow,
  Workflow,
  ScrollText,
  Layers,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { detailEntryId, type SettingsDetail } from '../../lib/settingsDetails';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotionPreference } from '../../hooks/useReducedMotionPreference';
import styles from './Preferences.module.css';
import { ActionButton, TextEntry } from '../content';

export function PreferenceGroup({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <div className={styles.prefGroupBlock}>
      {caption && <h3 className={styles.prefGroupCaption}>{caption}</h3>}
      <div className={styles.prefGroup}>{children}</div>
    </div>
  );
}
export function PreferenceCard({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <div className={styles.prefGroupBlock}>
      {caption && <h3 className={styles.prefGroupCaption}>{caption}</h3>}
      <div className={styles.prefCard}>{children}</div>
    </div>
  );
}

export function PreferenceReveal({
  visible,
  className,
  children,
}: {
  visible: boolean;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotionPreference();
  return (
    <AnimatePresence initial={false} propagate>
      {visible && (
        <motion.div
          className={className}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PreferenceButton({
  children,
  onClick,
  disabled,
  type = 'button',
  variant = 'primary',
}: {
  children: ReactNode;
  onClick?(): void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary';
}) {
  return (
    <ActionButton
      tone={variant}
      type={type}
      className={variant === 'primary' ? styles.primaryButton : styles.addRowButton}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </ActionButton>
  );
}

export function PreferenceIconButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onClick(): void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.iconButton}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function PreferenceRow({
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

export function PreferenceTextField({
  label,
  hint,
  value,
  onValueChange,
  multiline = false,
  type = 'text',
  invalid = false,
  error,
  action,
  placeholder,
  disabled,
  autoFocus,
  required,
  labelHidden = false,
  title,
}: {
  label: string;
  hint?: string;
  value: string;
  onValueChange(value: string): void;
  multiline?: boolean;
  type?: 'text' | 'password' | 'url';
  invalid?: boolean;
  error?: string;
  action?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  required?: boolean;
  labelHidden?: boolean;
  title?: string;
}) {
  const id = useId();
  return (
    <div className={styles.fieldLabel}>
      <label htmlFor={id} hidden={labelHidden}>
        {label}
      </label>
      {hint && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      <div className={styles.editRow}>
        <TextEntry
          id={id}
          label={label}
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required}
          title={title}
          describedBy={hint ? `${id}-hint` : undefined}
          invalid={invalid}
          multiline={multiline}
          rows={4}
          type={type}
          appearance="surface"
          className={`${styles.input} ${multiline ? styles.promptInput : ''} ${invalid ? styles.invalidInput : ''}`}
        />
        {action}
      </div>
      {error && (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PreferenceNumberField({
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
    <PreferenceRow label={label}>
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
    </PreferenceRow>
  );
}

const detailIcons: Partial<Record<SettingsDetail['page'], LucideIcon>> = {
  fonts: Type,
  weatherLocation: MapPin,
  weatherApiKey: CloudSun,
  searchTemplate: Search,
  backgroundImage: Image,
  addQuickApp: AppWindow,
  quickAppName: AppWindow,
  addWorkflow: Workflow,
  workflow: Workflow,
  thirdPartyLicenses: ScrollText,
  liquidGlass: Layers,
};

export function SettingLink({
  detail,
  navigate,
  ...props
}: {
  detail: SettingsDetail;
  navigate(detail: SettingsDetail): void;
  label: string;
  value?: string;
  hint?: string;
}) {
  return (
    <PreferenceLink
      {...props}
      icon={detailIcons[detail.page]}
      entry={detailEntryId(detail)}
      onClick={() => navigate(detail)}
    />
  );
}
