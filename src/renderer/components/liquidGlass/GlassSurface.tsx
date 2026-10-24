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
  handleExpansion?: number;
  className?: string;
  radius?: number;
  cornerK?: number;
  button?: boolean;
  hoverOnly?: boolean;
}

/** Decorative LeonardSEO material; the native control retains all input semantics. */
export function GlassSurface({
  controlRef,
  actorRef,
  disabled,
  slider,
  handle = false,
  handleExpansion,
  className,
  radius = 12,
  cornerK = 1,
  button,
  hoverOnly,
}: Props) {
  const glass = useGlassPreferences();
  const ref = useGlassMotion({
    controlRef,
    actorRef,
    enabled: !disabled && glass.settingsGlassEnabled,
    slider,
    handle,
    handleExpansion,
    hoverOnly,
    dragDeformation: glass.glassDragDeformation,
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
      dispersion={handle ? glass.glassDispersion * 1.5 : glass.glassDispersion}
      blur={handle ? 0 : glass.glassBlur}
      saturation={handle ? 1 + (glass.glassSaturation - 1) * 0.2 : glass.glassSaturation}
      specular={(handle ? 0.25 : button ? 0.16 : 1) * glass.glassSpecular}
      {...(handle
        ? {
            handle: true,
            tint: 'transparent',
            bezel: Math.max(2, radius * 0.3),
            thickness: radius * 0.3,
            rimGlow: 0.5,
          }
        : button
          ? { tint: 'dark', bezel: 6 }
          : {})}
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
