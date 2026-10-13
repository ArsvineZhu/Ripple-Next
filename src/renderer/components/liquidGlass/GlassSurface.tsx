import type { CSSProperties, RefObject } from 'react';
import { Material } from './vendor/adapted/Material';
import { useGlassMotion } from './useGlassMotion';
import './vendor/leonard/liquid-glass.css';
import styles from './GlassSurface.module.css';
import panel from './GlassPanel.module.css';
import { useGlassPreferences } from './GlassPreferences';

interface Props {
  controlRef: RefObject<HTMLElement | null>;
  actorRef?: RefObject<HTMLElement | null>;
  disabled?: boolean;
  slider?: boolean;
  handle?: boolean;
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
  handle = false,
  className,
  radius = 12,
  cornerK = 1,
  button,
}: Props) {
  const glass = useGlassPreferences();
  const ref = useGlassMotion({
    controlRef,
    actorRef,
    enabled: !disabled && glass.settingsGlassEnabled,
    slider,
    handle,
    elasticity: glass.glassElasticity,
  });
  if (!glass.settingsGlassEnabled) return null;
  const k = CSS.supports('corner-shape', 'superellipse(1.15)') ? cornerK : 1;
  return (
    <Material
      materialRef={ref}
      radius={radius}
      cornerK={k}
      ior={glass.glassIor}
      refraction={glass.glassRefraction}
      dispersion={glass.glassDispersion}
      blur={handle ? 0 : glass.glassBlur}
      saturation={handle ? glass.glassSaturation * 0.8 : glass.glassSaturation}
      specular={(button ? 0.16 : 1) * glass.glassSpecular}
      {...(button ? { tint: 'dark', bezel: 6 } : {})}
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
