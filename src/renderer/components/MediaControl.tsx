import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mediaCommandSupported, type MediaSession, type MediaCommand } from '../../shared/media';
import styles from './MediaControl.module.css';

export function MediaControl({
  session,
  command,
  disabled = false,
  compact = false,
  onCommand,
}: {
  session: MediaSession | null;
  command: MediaCommand;
  disabled?: boolean;
  compact?: boolean;
  onCommand(command: MediaCommand, sessionId: string): void | Promise<void>;
}) {
  const { t } = useTranslation();
  const Icon =
    command === 'previous'
      ? SkipBack
      : command === 'next'
        ? SkipForward
        : session?.state === 'playing'
          ? Pause
          : Play;
  return (
    <button
      type="button"
      className={styles.button}
      data-compact={compact || undefined}
      data-media-command={command}
      aria-label={t(command === 'playpause' ? 'playPause' : command)}
      disabled={disabled || !session || !mediaCommandSupported(session, command)}
      onClick={(event) => {
        event.stopPropagation();
        if (session) void onCommand(command, session.id);
      }}
    >
      <Icon
        size={compact ? 15 : command === 'playpause' ? 24 : 20}
        fill="currentColor"
        aria-hidden="true"
      />
    </button>
  );
}
