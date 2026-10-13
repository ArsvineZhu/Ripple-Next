import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import styles from './PreferenceSlider.module.css';
import { GlassHandle } from './liquidGlass/GlassHandle';
import { useGlassPreferences } from './liquidGlass/GlassPreferences';

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

/** Native continuous input with magnetic stops during held dragging. */
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
  const directDrag = useRef(false);
  const startX = useRef(0);
  const shell = useRef<HTMLDivElement>(null);
  const glass = useGlassPreferences();
  const inputRef = useRef<HTMLInputElement>(null);
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
  const nearestStop = (current: number) =>
    stops.reduce((best, stop) =>
      Math.abs(stop - current) < Math.abs(best - current) ? stop : best,
    );
  const attractionRange = (input: HTMLInputElement) => {
    const travel = Math.max(1, input.getBoundingClientRect().width - 32);
    return Math.min((range * glass.glassSnapPixels) / travel, range * 0.04);
  };
  const clear = useCallback(() => {
    dragging.current = directDrag.current = false;
    shell.current?.removeAttribute('data-slider-dragging');
  }, []);
  useEffect(() => {
    window.addEventListener('blur', clear);
    return () => window.removeEventListener('blur', clear);
  }, [clear]);

  return (
    <div
      ref={shell}
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
          ref={inputRef}
          className={styles.input}
          type="range"
          aria-label={label}
          aria-description={`${startLabel} — ${endLabel}`}
          min={min}
          max={max}
          step="any"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const current = Number(event.currentTarget.value);
            if (!dragging.current) {
              onValueChange(current);
              return;
            }
            const nearest = nearestStop(current);
            const threshold = attractionRange(event.currentTarget);
            const distance = Math.abs(nearest - current);
            if (distance >= threshold || threshold <= 0) {
              onValueChange(current);
              return;
            }
            // A small sticky centre joins a smooth attraction field with no position jump.
            const fraction = Math.max(0, (distance / threshold - 0.2) / 0.8);
            const blend = fraction ** 3 * (fraction * (fraction * 6 - 15) + 10);
            onValueChange(nearest + (current - nearest) * blend);
          }}
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
            startX.current = event.clientX;
            const rect = event.currentTarget.getBoundingClientRect();
            const centre = rect.left + 16 + ((rect.width - 32) * progress) / 100;
            directDrag.current = Math.abs(event.clientX - centre) <= 16;
            shell.current?.toggleAttribute('data-slider-dragging', directDrag.current);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (
              dragging.current &&
              !directDrag.current &&
              Math.abs(event.clientX - startX.current) > 3
            ) {
              directDrag.current = true;
              shell.current?.setAttribute('data-slider-dragging', '');
            }
          }}
          onPointerUp={(event) => {
            if (!dragging.current) return;
            clear();
            const current = Number(event.currentTarget.value);
            const threshold = attractionRange(event.currentTarget);
            const nearest = nearestStop(current);
            if (nearest !== current && Math.abs(nearest - current) <= threshold)
              onValueChange(nearest);
          }}
          onPointerCancel={clear}
          onLostPointerCapture={(event) => {
            // Chromium can transfer capture to its internal range thumb during a held drag.
            if (!(event.buttons & 1)) clear();
          }}
        />
        <span className={styles.thumbPosition} aria-hidden="true">
          <GlassHandle
            controlRef={inputRef}
            disabled={disabled}
            slider
            radius={11}
            cornerK={1.15}
          />
        </span>
      </div>
      <span className={styles.endpoint} aria-hidden="true">
        {endLabel}
      </span>
    </div>
  );
}
