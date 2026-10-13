import type { CSSProperties, RefObject } from 'react';
import { Material } from './vendor/adapted/Material';
import { useGlassMotion } from './useGlassMotion';
import './vendor/leonard/liquid-glass.css';
import styles from './GlassSurface.module.css';
import panel from './GlassPanel.module.css';

interface Props {
  controlRef: RefObject<HTMLElement | null>;
  actorRef?: RefObject<HTMLElement | null>;
  disabled?: boolean;
  slider?: boolean;
  className?: string;
  radius?: number;
  cornerK?: number;
  button?: boolean;
}

/** Decorative LeonardSEO material; the native control retains all input semantics. */
export function GlassSurface({
  controlRef,
  actorRef,
  disabled,
  slider,
  className,
  radius = 12,
  cornerK = 1,
  button,
}: Props) {
  const ref = useGlassMotion({ controlRef, actorRef, enabled: !disabled, slider });
  const k = CSS.supports('corner-shape', 'superellipse(1.15)') ? cornerK : 1;
  return (
    <Material
      materialRef={ref}
      radius={radius}
      cornerK={k}
      {...(button ? { tint: 'dark', bezel: 6, specular: 0.16 } : {})}
      aria-hidden="true"
      className={`${styles.surface} ${actorRef ? styles.external : styles.actor} ${button ? panel.material : ''} ${className ?? ''}`}
      style={
        {
          cornerShape: `superellipse(${k})`,
          ...(button ? { '--lg-tint': 'var(--glass-panel-tint)' } : {}),
          transition: 'transform var(--motion-duration, 0.2s) ease-out, box-shadow 0.3s ease',
        } as CSSProperties
      }
    />
  );
}
