import styles from './PreferenceSwitch.module.css';
import { useRef } from 'react';
import { GlassHandle } from './liquidGlass/GlassHandle';

interface Props {
  label: string;
  checked: boolean;
  disabled?: boolean;
  busy?: boolean;
  onCheckedChange(checked: boolean): void;
}

/** A native checkbox owns switch activation and its checked state. */
export function PreferenceSwitch({ label, checked, disabled, busy, onCheckedChange }: Props) {
  const ref = useRef<HTMLLabelElement>(null);
  return (
    <label
      ref={ref}
      className={styles.switch}
      data-disabled={disabled || undefined}
      data-island-interactive
    >
      <input
        className={styles.input}
        type="checkbox"
        role="switch"
        aria-label={label}
        aria-busy={busy || undefined}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb}>
          <GlassHandle controlRef={ref} disabled={disabled} radius={12} />
        </span>
      </span>
    </label>
  );
}
