import { useRef, useState } from 'react';
import { colorWithAlpha, parseColor } from '../../shared/color';
import styles from './NativeColorField.module.css';

interface Props {
  label: string;
  value: string;
  onValueChange(value: string): void;
}

function resolvedColor(value: string) {
  const parsed = parseColor(value);
  if (parsed) return parsed;
  const probe = document.createElement('span');
  probe.style.color = value;
  document.body.append(probe);
  const resolved = parseColor(getComputedStyle(probe).color);
  probe.remove();
  return resolved ?? { hex: '#000000', alpha: 1 };
}

export function NativeColorField({ label, value, onValueChange }: Props) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    const initial = resolvedColor(value);
    try {
      const selected = await window.electronAPI.showColorPicker(initial.hex);
      if (selected !== null) onValueChange(colorWithAlpha(selected, initial.alpha));
    } catch {
      // The main IPC boundary publishes the settings notice.
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      aria-label={`${label}: ${value}`}
      aria-busy={busy}
      disabled={busy}
      className={styles.field}
      onClick={() => void choose()}
      data-island-interactive
    >
      <span className={styles.swatch} style={{ backgroundColor: value }} aria-hidden="true" />
      <span className={styles.value}>{value}</span>
    </button>
  );
}
