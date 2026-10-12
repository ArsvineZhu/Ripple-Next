import { useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import styles from './PreferenceSlider.module.css';

interface Props {
  label: string;
  startLabel: string;
  endLabel: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  stages?: 2 | 3 | 5 | 7;
  disabled?: boolean;
  onValueChange(value: number): void;
}

/** Native continuous input with optional magnetic stops on pointer release. */
export function PreferenceSlider({
  label,
  startLabel,
  endLabel,
  value,
  min,
  max,
  step = 1,
  stages = 5,
  disabled = false,
  onValueChange,
}: Props) {
  const dragging = useRef(false);
  const range = max - min;
  const stops = useMemo(
    () => [
      ...new Set(
        Array.from({ length: stages }, (_, index) => min + (range * index) / (stages - 1)),
      ),
    ],
    [min, range, stages],
  );
  const progress = Math.max(0, Math.min(100, ((value - min) / range) * 100));

  return (
    <div
      className={styles.slider}
      data-disabled={disabled || undefined}
      style={{ '--slider-fraction': progress / 100 } as CSSProperties}
    >
      <span className={styles.endpoint} aria-hidden="true">
        {startLabel}
      </span>
      <div className={styles.well}>
        <div className={styles.track} aria-hidden="true">
          <div className={styles.fill} />
        </div>
        <div className={styles.stops} aria-hidden="true">
          {stops.map((stop) => (
            <span
              key={stop}
              className={styles.stop}
              data-active={Math.abs(value - stop) < 0.0001 || undefined}
              style={{ left: `${((stop - min) / range) * 100}%` }}
            />
          ))}
        </div>
        <input
          className={styles.input}
          type="range"
          aria-label={label}
          aria-description={`${startLabel} — ${endLabel}`}
          min={min}
          max={max}
          step="any"
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(Number(event.target.value))}
          onKeyDown={(event) => {
            let next: number;
            const increment = event.shiftKey ? step / 10 : step;
            const current = Number(event.currentTarget.value);
            if (event.key === 'Home') next = min;
            else if (event.key === 'End') next = max;
            else if (event.key === 'ArrowRight' || event.key === 'ArrowUp')
              next = current + increment;
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown')
              next = current - increment;
            else if (event.key === 'PageUp') next = current + increment * 10;
            else if (event.key === 'PageDown') next = current - increment * 10;
            else return;
            event.preventDefault();
            onValueChange(Math.max(min, Math.min(max, Number(next.toFixed(6)))));
          }}
          onPointerDown={(event) => {
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (!dragging.current) return;
            dragging.current = false;
            const current = Number(event.currentTarget.value);
            const travel = Math.max(1, event.currentTarget.getBoundingClientRect().width - 40);
            const threshold = Math.min((range * 6) / travel, range * 0.02);
            const nearest = stops.reduce((best, stop) =>
              Math.abs(stop - current) < Math.abs(best - current) ? stop : best,
            );
            if (nearest !== current && Math.abs(nearest - current) <= threshold)
              onValueChange(nearest);
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
          onLostPointerCapture={() => {
            dragging.current = false;
          }}
        />
      </div>
      <span className={styles.endpoint} aria-hidden="true">
        {endLabel}
      </span>
    </div>
  );
}
