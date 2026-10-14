import styles from './QuickView.module.css';
import typography from '../styles/typography.module.css';
import { useTranslation } from 'react-i18next';
import { localeForFormatting } from '../../shared/i18n';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import { MediaArtwork } from './MediaArtwork';
import { MediaTransition } from './MediaTransition';
import { MediaMarquee } from './MediaMarquee';
import { MediaControl } from './MediaControl';
import { MediaFeedback } from './MediaFeedback';
import { Zap } from 'lucide-react';
import { Camera } from 'lucide-react';
import { Mic } from 'lucide-react';
import { Headphones } from 'lucide-react';
import { WeatherIcon } from '../components/WeatherIcon';
import type { IslandController } from '../hooks/useIslandController';
import type { useMedia } from '../hooks/useMedia';
import type { useOverview } from '../hooks/useOverview';
import type { useBattery } from '../hooks/useBattery';

type Props = Pick<
  IslandController,
  | 'mode'
  | 'music'
  | 'showInfoWhenIdleEnabled'
  | 'isPlaying'
  | 'alert'
  | 'chargingAlert'
  | 'bluetoothAlert'
  | 'cameraAlert'
  | 'microphoneAlert'
  | 'trackTitle'
  | 'trackArtist'
  | 'hideNotActiveIslandEnabled'
  | 'textColor'
  | 'standbyBorderEnabled'
> &
  Pick<
    ReturnType<typeof useMedia>,
    | 'mediaTrack'
    | 'mediaSnapshot'
    | 'mediaActionError'
    | 'mediaBusy'
    | 'controlMedia'
    | 'openMediaSession'
    | 'showPausedQuickView'
  > &
  Pick<ReturnType<typeof useOverview>, 'time' | 'weather'> &
  Pick<ReturnType<typeof useBattery>, 'percent'>;
export function QuickView({
  mode,
  music,
  showInfoWhenIdleEnabled,
  isPlaying,
  showPausedQuickView,
  alert,
  chargingAlert,
  bluetoothAlert,
  cameraAlert,
  microphoneAlert,
  mediaTrack,
  mediaSnapshot,
  mediaActionError,
  mediaBusy,
  controlMedia,
  openMediaSession,
  trackTitle,
  trackArtist,
  hideNotActiveIslandEnabled,
  textColor,
  time,
  percent,
  standbyBorderEnabled,
  weather,
}: Props) {
  const { t, i18n } = useTranslation();
  const showArtist = mode === 'quick' || music.idleArtist;
  const number = (value: number | string | null) =>
    value === null || value === ''
      ? '??'
      : new Intl.NumberFormat(localeForFormatting(i18n.language)).format(Number(value));
  return (
    <>
      {mode !== 'large' &&
      (mode === 'quick' ||
        (mode === 'still' && showInfoWhenIdleEnabled) ||
        (mode === 'still' && (isPlaying || showPausedQuickView)) ||
        alert ||
        chargingAlert ||
        bluetoothAlert ||
        cameraAlert ||
        microphoneAlert) ? (
        <AnimatePresence mode="wait">
          {(isPlaying || showPausedQuickView) &&
          !alert &&
          !chargingAlert &&
          !bluetoothAlert &&
          !cameraAlert &&
          !microphoneAlert ? (
            <motion.div
              className={styles['playing']}
              key={mediaTrack?.id ?? 'playing'}
              initial={{ opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1], filter: { duration: 0.05 } }}
              style={{
                opacity: showPausedQuickView ? 0.5 : hideNotActiveIslandEnabled ? 0.6 : 1,
                filter: showPausedQuickView ? 'grayscale(1)' : 'none',
              }}
            >
              <div className={styles['trackRow']}>
                <MediaArtwork
                  session={mediaTrack}
                  compact
                  disabled={mediaBusy}
                  textColor={textColor}
                  onOpen={(id) => void openMediaSession(id)}
                  preferences={music}
                />
                <div className={styles.trackClip} style={{ color: textColor }}>
                  <MediaTransition
                    identity={JSON.stringify([
                      mediaTrack?.id,
                      trackTitle,
                      showArtist ? trackArtist : '',
                    ])}
                  >
                    <MediaMarquee enabled={music.marquee} className={styles.trackText}>
                      {trackTitle}
                      {showArtist && <span className={styles.artist}> • {trackArtist}</span>}
                    </MediaMarquee>
                  </MediaTransition>
                </div>
                {mode === 'quick' && (
                  <div className={styles.playButton}>
                    <MediaControl
                      session={mediaTrack}
                      compact
                      command="playpause"
                      disabled={mediaBusy || mediaSnapshot.status === 'error'}
                      onCommand={controlMedia}
                    />
                  </div>
                )}
              </div>
              <MediaFeedback error={mediaActionError ?? mediaSnapshot.error} compact />
            </motion.div>
          ) : (
            <motion.div
              className={styles['status']}
              key={
                chargingAlert
                  ? 'charging'
                  : alert
                    ? 'battery'
                    : bluetoothAlert
                      ? 'bluetooth'
                      : cameraAlert
                        ? 'camera'
                        : microphoneAlert
                          ? 'microphone'
                          : 'time'
              }
              initial={{ opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1], filter: { duration: 0.05 } }}
            >
              <h1
                className={[typography['text'], styles['statusLeft']].join(' ')}
                style={{
                  color: chargingAlert
                    ? '#6fff7bff'
                    : alert
                      ? '#ff3f3fff'
                      : cameraAlert
                        ? '#ffff00ff'
                        : microphoneAlert
                          ? '#ff9a00ff'
                          : textColor,
                }}
              >
                {chargingAlert ? (
                  <Zap size={20} color="#6fff7b" />
                ) : alert ? (
                  <Zap size={20} color="#ff3f3f" />
                ) : cameraAlert ? (
                  <Camera size={20} color="#ffff00" />
                ) : microphoneAlert ? (
                  <Mic size={20} color="#ff9a00" />
                ) : bluetoothAlert ? (
                  <Headphones size={20} />
                ) : (
                  time
                )}
              </h1>
              <h1
                className={[typography['text'], styles['statusRight']].join(' ')}
                style={{
                  color: chargingAlert
                    ? '#6fff7bff'
                    : alert
                      ? '#ff3f3fff'
                      : cameraAlert
                        ? '#ffff00ff'
                        : microphoneAlert
                          ? '#ff9a00ff'
                          : `${textColor}`,
                }}
              >
                {alert === true ? (
                  `${number(percent)}%`
                ) : chargingAlert === true ? (
                  `${number(percent)}%`
                ) : standbyBorderEnabled ? (
                  `${number(percent)}%`
                ) : cameraAlert ? (
                  t('camera')
                ) : microphoneAlert ? (
                  t('microphone')
                ) : bluetoothAlert ? (
                  t('connected')
                ) : weather ? (
                  <div className={styles['weather']}>
                    <WeatherIcon status={weather.status} size={14} color={textColor} />
                    <span>{number(weather.temp)}º</span>
                  </div>
                ) : (
                  `${number(percent)}%`
                )}
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
      ) : null}
    </>
  );
}
