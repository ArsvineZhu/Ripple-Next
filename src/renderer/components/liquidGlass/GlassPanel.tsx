import type { CSSProperties } from 'react';
import { Material } from './vendor/adapted/Material';
import './vendor/leonard/liquid-glass.css';
import styles from './GlassSurface.module.css';
import panel from './GlassPanel.module.css';

/** Menu material sits behind the native menu's text and hit targets. */
export function GlassPanel() {
  const cornerK = CSS.supports('corner-shape', 'superellipse(1.62)') ? 1.62 : 1;
  return (
    <Material
      radius={24}
      bezel={8}
      cornerK={cornerK}
      tint="dark"
      specular={0.16}
      aria-hidden="true"
      className={`${styles.surface} ${styles.external} ${panel.material}`}
      style={
        {
          cornerShape: `superellipse(${cornerK})`,
          '--lg-tint': 'var(--glass-panel-tint)',
        } as CSSProperties
      }
    />
  );
}
