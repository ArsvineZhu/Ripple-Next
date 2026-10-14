import { useTranslation } from 'react-i18next';
import { MediaControl } from '../components/MediaControl';
import { MediaFeedback } from '../components/MediaFeedback';
import type { useMedia } from '../hooks/useMedia';
import type { MediaSession } from '../../shared/media';
import { selectAutomaticSession } from '../../shared/media';
import { MediaMarquee } from '../components/MediaMarquee';
import { MediaArtwork } from '../components/MediaArtwork';
import { MediaTransition } from '../components/MediaTransition';
import { MediaSessionCarousel } from '../components/MediaSessionCarousel';
import styles from './NowPlayingTab.module.css';
import { defaultMusicPreferences, type MusicPreferences } from '../../shared/musicPreferences';

type Props = Omit<ReturnType<typeof useMedia>, 'showPausedQuickView'> & {
  textColor: string;
  music?: MusicPreferences;
};
function TrackText({
  text,
  artist = false,
  active,
  marquee,
}: {
  text: string;
  artist?: boolean;
  active: boolean;
  marquee: boolean;
}) {
  return (
    <MediaTransition identity={text}>
      <MediaMarquee
        enabled={marquee}
        active={active}
        className={artist ? styles.artist : styles.title}
      >
        {text}
      </MediaMarquee>
    </MediaTransition>
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
        preferences={props.music}
      />
      <div className={styles.details}>
        {showPlayer && (
          <p className={styles.playerName} title={session.playerName}>
            {session.playerName}
          </p>
        )}
        <TrackText
          text={session.name || t('unknownSong')}
          active={active}
          marquee={(props.music ?? defaultMusicPreferences).marquee}
        />
        <TrackText
          text={session.artist || t('unknownArtist')}
          artist
          active={active}
          marquee={(props.music ?? defaultMusicPreferences).marquee}
        />
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
