import { useId, useState } from 'react';
import styles from './SettingsTab.module.css';

export function AIField({
  label,
  value,
  onChange,
  valid = () => true,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  valid?(value: string): boolean;
  multiline?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const change = (text: string) => {
    setDraft(text);
    if (valid(text)) onChange(text);
  };
  return (
    <label className={styles.fieldLabel} htmlFor={id}>
      {label}
      {multiline ? (
        <textarea
          id={id}
          className={`${styles.input} ${styles.promptInput}`}
          rows={4}
          value={draft}
          onChange={(e) => change(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className={styles.input}
          value={draft}
          aria-invalid={!valid(draft)}
          onChange={(e) => change(e.target.value)}
        />
      )}
    </label>
  );
}
