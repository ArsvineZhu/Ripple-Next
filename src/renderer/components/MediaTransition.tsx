import type { ReactNode } from 'react';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import styles from './MediaTransition.module.css';

/** Keep a single current layer, including across React Activity suspension. */
export function MediaTransition({ identity, children }: { identity: string; children: ReactNode }) {
  const reduced = useReducedMotionPreference();
  return (
    <div className={styles.transition} data-media-transition>
      <div
        key={identity}
        className={styles.layer}
        data-media-layer="current"
        data-reduced-motion={reduced}
      >
        {children}
      </div>
    </div>
  );
}
