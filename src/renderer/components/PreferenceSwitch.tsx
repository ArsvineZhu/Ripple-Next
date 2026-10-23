import styles from './PreferenceSwitch.module.css';
import { useCallback, useEffect, useRef } from 'react';
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
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    position: number;
    travel: number;
    dragging: boolean;
    value: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const finish = useCallback(() => {
    if (gesture.current?.dragging) suppressClick.current = true;
    gesture.current = null;
    ref.current?.removeAttribute('data-switch-dragging');
    ref.current?.style.removeProperty('--switch-position');
  }, []);
  useEffect(() => {
    window.addEventListener('blur', finish);
    return () => window.removeEventListener('blur', finish);
  }, [finish]);
  useEffect(() => {
    if (disabled) finish();
  }, [disabled, finish]);
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
        onChange={(event) => {
          if (!event.nativeEvent.defaultPrevented) onCheckedChange(event.currentTarget.checked);
        }}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0 || !event.isPrimary) return;
          suppressClick.current = false;
          const track = ref.current?.querySelector<HTMLElement>(`.${styles.track}`);
          const thumb = ref.current?.querySelector<HTMLElement>(`.${styles.thumb}`);
          if (!track || !thumb) return;
          const style = getComputedStyle(track);
          const travel = Math.max(
            1,
            track.clientWidth -
              parseFloat(style.paddingLeft) -
              parseFloat(style.paddingRight) -
              thumb.offsetWidth,
          );
          gesture.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            position: checked ? travel : 0,
            travel,
            dragging: false,
            value: checked,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const current = gesture.current;
          if (!current || current.id !== event.pointerId || disabled) return;
          const dx = event.clientX - current.x,
            dy = event.clientY - current.y;
          if (!current.dragging) {
            if (Math.abs(dx) < 3 || Math.abs(dx) <= Math.abs(dy)) return;
            current.dragging = true;
            ref.current?.setAttribute('data-switch-dragging', '');
          }
          const position = Math.max(0, Math.min(current.travel, current.position + dx));
          ref.current?.style.setProperty('--switch-position', `${position}px`);
          const midpoint = current.travel / 2;
          const value =
            position > midpoint + 1 ? true : position < midpoint - 1 ? false : current.value;
          if (value !== current.value) {
            current.value = value;
            onCheckedChange(value);
          }
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={(event) => {
          if (!(event.buttons & 1)) finish();
        }}
        onClickCapture={(event) => {
          if (suppressClick.current && event.detail > 0) event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') suppressClick.current = false;
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb}>
          <GlassHandle controlRef={ref} disabled={disabled} radius={6.5} cornerK={1.15} />
        </span>
      </span>
    </label>
  );
}
