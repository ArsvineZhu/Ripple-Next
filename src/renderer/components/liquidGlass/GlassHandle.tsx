import { useRef, type CSSProperties, type RefObject } from 'react';
import { GlassSurface } from './GlassSurface';
import motion from './GlassSurface.module.css';
import styles from './GlassHandle.module.css';

/** A solid resting capsule reveals one clear lens while the native control is held. */
export function GlassHandle({
  controlRef,
  disabled,
  slider = false,
  radius,
  cornerK = 1,
  expansion = 1.6,
}: {
  controlRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
  slider?: boolean;
  radius: number;
  cornerK?: number;
  expansion?: number;
}) {
  const actor = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={actor}
      className={`${styles.handle} ${motion.actor}`}
      data-glass-handle
      aria-hidden="true"
      style={{ borderRadius: radius, '--handle-expansion': expansion } as CSSProperties}
    >
      <GlassSurface
        controlRef={controlRef}
        actorRef={actor}
        disabled={disabled}
        slider={slider}
        handle
        button
        radius={radius * expansion}
        handleExpansion={expansion}
        cornerK={cornerK}
        className={styles.lens}
      />
      <span className={styles.solid} />
    </span>
  );
}
