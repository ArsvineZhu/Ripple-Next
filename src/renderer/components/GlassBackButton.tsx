import { useRef } from 'react';
import { ChevronLeft, type LucideIcon } from 'lucide-react';
import { GlassSurface } from './liquidGlass/GlassSurface';
import motion from './liquidGlass/GlassSurface.module.css';
import styles from './GlassBackButton.module.css';
import { useGlassPreferences } from './liquidGlass/GlassPreferences';

export function GlassBackButton({
  label,
  onClick,
  icon: Icon = ChevronLeft,
}: {
  label: string;
  onClick(): void;
  icon?: LucideIcon;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const glass = useGlassPreferences();
  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.button} ${motion.actor}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      data-island-interactive
      data-glass-enabled={glass.settingsGlassEnabled}
    >
      <GlassSurface controlRef={ref} actorRef={ref} radius={16} button />
      <Icon size={18} className={styles.icon} aria-hidden="true" />
    </button>
  );
}
