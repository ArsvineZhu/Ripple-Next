import { Music } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { MediaSession } from '../../shared/media';
import { useMediaArtwork } from '../hooks/useMediaArtwork';
import styles from './MediaArtwork.module.css';

export function MediaArtwork({
  session,
  compact = false,
  disabled,
  textColor,
  onOpen,
}: {
  session: MediaSession | null;
  compact?: boolean;
  disabled: boolean;
  textColor: string;
  onOpen(id: string): void;
}) {
  const artwork = useMediaArtwork(session);
  const reduced = useReducedMotion();
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={styles.button}
      data-compact={compact}
      disabled={disabled || !session || !!session.stale}
      aria-label={t('mediaOpenPlayer', { player: session?.playerName ?? '' })}
      onClick={() => {
        if (session) onOpen(session.id);
      }}
      onMouseEnter={() => artwork.setHovered(true)}
      onMouseLeave={() => {
        artwork.setHovered(false);
        artwork.setRotation({ x: 0, y: 0 });
      }}
      onMouseMove={(event) => {
        if (reduced || !artwork.url) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const radius = Math.hypot(rect.width, rect.height) / 2;
        if (!radius) return;
        const angle = compact ? 35 : 15;
        artwork.setRotation({
          x: ((event.clientY - rect.top - rect.height / 2) / radius) * angle,
          y: ((event.clientX - rect.left - rect.width / 2) / radius) * -angle,
        });
      }}
      style={{
        color: textColor,
        transform:
          reduced || !artwork.url
            ? 'none'
            : `perspective(600px) rotateX(${artwork.rotation.x}deg) rotateY(${artwork.rotation.y}deg) scale(${artwork.hovered ? (compact ? 1.25 : 1.08) : 1})`,
      }}
    >
      {artwork.url ? (
        <img
          key={JSON.stringify([session?.id, artwork.url])}
          src={artwork.url}
          alt=""
          draggable={false}
          onError={artwork.onError}
        />
      ) : (
        <Music size={compact ? 14 : 40} aria-hidden="true" />
      )}
    </button>
  );
}
