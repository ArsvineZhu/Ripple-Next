import type { ReactNode } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import styles from './MediaTransition.module.css';

function Layer({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  const reduced = useReducedMotionPreference();
  return (
    <motion.div
      className={styles.layer}
      data-media-layer={present ? 'current' : 'exit'}
      aria-hidden={!present || undefined}
      initial={{ opacity: 0, filter: reduced ? 'none' : 'blur(6px)' }}
      animate={{ opacity: 1, filter: reduced ? 'none' : 'blur(0px)' }}
      exit={{ opacity: 0, filter: reduced ? 'none' : 'blur(6px)' }}
      transition={{ duration: reduced ? 0 : 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Artwork and text share the same swap motion without changing their layout. */
export function MediaTransition({ identity, children }: { identity: string; children: ReactNode }) {
  const reduced = useReducedMotionPreference();
  if (reduced)
    return (
      <div className={styles.transition} data-media-transition>
        <div className={styles.layer} data-media-layer="current" key={identity}>
          {children}
        </div>
      </div>
    );

  return (
    <div className={styles.transition} data-media-transition>
      <AnimatePresence initial={false}>
        <Layer key={identity}>{children}</Layer>
      </AnimatePresence>
    </div>
  );
}
