import { Box, Music, MoveHorizontal, UserRound, AudioLines } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsContext } from '../components/SettingsProvider';
import { PreferenceGroup, PreferenceRow, PreferenceReveal } from '../components/preferences';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { PreferenceSlider } from '../components/PreferenceSlider';
import { Select } from '../components/Select';
import { Feedback } from '../components/content';
import { useMedia } from '../hooks/useMedia';

export function SettingsMusic() {
  const { t } = useTranslation();
  const p = useSettingsContext();
  const music = p.settings.music;
  const media = useMedia();
  return (
    <>
      <PreferenceGroup caption={t('musicAppearance')}>
        <PreferenceRow icon={Box} label={t('musicArtwork3D')} hint={t('musicArtwork3DHint')}>
          <PreferenceSwitch
            label={t('musicArtwork3D')}
            checked={music.artwork3D}
            onCheckedChange={(artwork3D) => p.updateSettings({ music: { ...music, artwork3D } })}
          />
        </PreferenceRow>
        <PreferenceReveal visible={music.artwork3D}>
          <PreferenceRow label={t('musicArtworkStrength')}>
            <PreferenceSlider
              label={t('musicArtworkStrength')}
              value={music.artworkStrength}
              min={0}
              max={2}
              step={0.05}
              stages={3}
              startLabel={t('musicStrengthLow')}
              endLabel={t('musicStrengthHigh')}
              onValueChange={(artworkStrength) =>
                p.updateSettings({ music: { ...music, artworkStrength } })
              }
            />
          </PreferenceRow>
        </PreferenceReveal>
        <PreferenceRow icon={MoveHorizontal} label={t('musicMarquee')} hint={t('musicMarqueeHint')}>
          <PreferenceSwitch
            label={t('musicMarquee')}
            checked={music.marquee}
            onCheckedChange={(marquee) => p.updateSettings({ music: { ...music, marquee } })}
          />
        </PreferenceRow>
        <PreferenceRow
          icon={UserRound}
          label={t('musicIdleArtist')}
          hint={t('musicIdleArtistHint')}
        >
          <PreferenceSwitch
            label={t('musicIdleArtist')}
            checked={music.idleArtist}
            onCheckedChange={(idleArtist) => p.updateSettings({ music: { ...music, idleArtist } })}
          />
        </PreferenceRow>
      </PreferenceGroup>
      <PreferenceGroup caption={t('musicPlayer')}>
        <PreferenceRow icon={AudioLines} label={t('musicPlayer')} hint={t('musicPlayerHint')}>
          <Select
            label={t('musicPlayer')}
            value={media.mediaSnapshot.manualSessionId ?? 'automatic'}
            disabled={media.mediaBusy}
            options={[
              { value: 'automatic', label: t('mediaAutomatic') },
              ...media.mediaSnapshot.sessions.map((session) => ({
                value: session.id,
                label: session.playerName,
                description: session.name || t('unknownSong'),
              })),
            ]}
            onValueChange={(id) => void media.selectMediaSession(id === 'automatic' ? null : id)}
          />
        </PreferenceRow>
        {media.mediaSnapshot.sessions.length === 0 && (
          <PreferenceRow icon={Music} label={t('nothingPlaying')} hint={t('musicPlayerEmpty')}>
            {null}
          </PreferenceRow>
        )}
        {(media.mediaActionError || media.mediaSnapshot.error) && (
          <Feedback>{t(media.mediaActionError ?? media.mediaSnapshot.error!)}</Feedback>
        )}
      </PreferenceGroup>
    </>
  );
}
