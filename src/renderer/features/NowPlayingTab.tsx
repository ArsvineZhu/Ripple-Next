import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MediaControl } from '../components/MediaControl';
import { MediaFeedback } from '../components/MediaFeedback';
import type { useMedia } from '../hooks/useMedia';
import type { MediaSession } from '../../shared/media';
import { selectAutomaticSession } from '../../shared/media';
import { measureTextWidth } from '../lib/text';
import { MediaArtwork } from '../components/MediaArtwork';
import { MediaSessionCarousel } from '../components/MediaSessionCarousel';
import styles from './NowPlayingTab.module.css';

type Props = Omit<ReturnType<typeof useMedia>, 'showPausedQuickView'> & { textColor: string };
function useClipWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(150);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      if (node.clientWidth > 0) setWidth(node.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
function TrackText({
  text,
  artist = false,
  active,
}: {
  text: string;
  artist?: boolean;
  active: boolean;
}) {
  const { ref, width } = useClipWidth();
  const reduced = useReducedMotion();
  const distance = measureTextWidth(text, artist ? 13 : 18);
  const scroll = distance > width && !reduced;
  return (
    <div ref={ref} className={styles.textClip} data-marquee={scroll}>
      <motion.div
        className={artist ? styles.artist : styles.title}
        animate={scroll && active ? { x: [0, -(distance + 30)] } : { x: 0 }}
        transition={
          scroll && active ? { duration: 10, repeat: Infinity, ease: 'linear' } : { duration: 0 }
        }
      >
        <span>{text}</span>
        {scroll && <span aria-hidden="true">{text}</span>}
      </motion.div>
    </div>
  );
}
function TrackCard({
  session,
  active,
  showPlayer,
  props,
}: {
  session: MediaSession | null;
  active: boolean;
  showPlayer: boolean;
  props: Props;
}) {
  const { t } = useTranslation();
  if (!session)
    return (
      <div className={styles.emptyState} style={{ color: props.textColor }}>
        <h3 className={styles.emptyTitle}>
          {t(props.mediaSnapshot.status === 'error' ? 'mediaReadFailed' : 'nothingPlaying')}
        </h3>
        <p className={styles.emptyHint}>{t('playMusicHint')}</p>
      </div>
    );
  const disabled = !active || props.mediaBusy;
  return (
    <div
      className={styles.track}
      data-playback-state={session.state}
      data-media-session={session.id}
      style={{ color: props.textColor }}
    >
      <MediaArtwork
        session={session}
        disabled={disabled}
        textColor={props.textColor}
        onOpen={(id) => void props.openMediaSession(id)}
      />
      <div className={styles.details}>
        {showPlayer && (
          <p className={styles.playerName} title={session.playerName}>
            {session.playerName}
          </p>
        )}
        <TrackText text={session.name || t('unknownSong')} active={active} />
        <TrackText text={session.artist || t('unknownArtist')} artist active={active} />
        <div className={styles.controls}>
          {(['previous', 'playpause', 'next'] as const).map((command) => (
            <MediaControl
              key={command}
              session={session}
              command={command}
              disabled={disabled}
              onCommand={props.controlMedia}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
export function NowPlayingTab(props: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.trackRegion}>
        <MediaSessionCarousel
          sessions={props.mediaSnapshot.sessions}
          selectedId={props.mediaPageId}
          onSelect={(id) => void props.selectMediaSession(id)}
          textColor={props.textColor}
          renderPage={(session, active, showPlayer) => (
            <TrackCard
              session={
                session ??
                selectAutomaticSession(
                  props.mediaSnapshot.sessions,
                  props.mediaSnapshot.activeSessionId,
                ) ??
                props.mediaTrack
              }
              active={active}
              showPlayer={showPlayer}
              props={props}
            />
          )}
        />
      </div>
      <MediaFeedback
        error={props.mediaActionError ?? (props.mediaTrack ? props.mediaSnapshot.error : null)}
      />
    </div>
  );
}
