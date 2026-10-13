import { useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { GlassSurface } from './liquidGlass/GlassSurface';
import motion from './liquidGlass/GlassSurface.module.css';
import styles from './GlassBackButton.module.css';

export function GlassBackButton({ label, onClick }: { label: string; onClick(): void }) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.button} ${motion.actor}`}
      aria-label={label}
      onClick={onClick}
      data-island-interactive
    >
      <GlassSurface controlRef={ref} actorRef={ref} radius={18} button />
      <ArrowLeft size={18} className={styles.icon} aria-hidden="true" />
    </button>
  );
}
