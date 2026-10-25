import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Command } from 'lucide-react';
import type { SettingsCategoryId } from '../lib/settingsCategories';
import { PreferenceCard } from '../components/preferences';
import typographyVideo from '../../assets/guide/typography.webm';
import typographyPoster from '../../assets/guide/typography.png';
import appearanceVideo from '../../assets/guide/appearance.webm';
import appearancePoster from '../../assets/guide/appearance.png';
import workflowVideo from '../../assets/guide/workflow.webm';
import workflowPoster from '../../assets/guide/workflow.png';
import aiVideo from '../../assets/guide/ai.webm';
import aiPoster from '../../assets/guide/ai.png';
import expressionVideo from '../../assets/guide/expression.webm';
import expressionPoster from '../../assets/guide/expression.png';
import styles from './SettingsGuide.module.css';

function Recording({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) video.pause();
    });
    observer.observe(video);
    const pauseHidden = () => {
      if (document.hidden) video.pause();
    };
    document.addEventListener('visibilitychange', pauseHidden);
    return () => {
      video.pause();
      observer.disconnect();
      document.removeEventListener('visibilitychange', pauseHidden);
    };
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      controls
      preload="metadata"
      aria-label={label}
      className={styles.recording}
      onPlay={(event) => {
        document.querySelectorAll('video').forEach((video) => {
          if (video !== event.currentTarget) video.pause();
        });
      }}
    />
  );
}

export function SettingsGuide({ navigate }: { navigate(category: SettingsCategoryId): void }) {
  const { t } = useTranslation();
  const keys = [
    { keys: ['←', '→'], title: 'guidePages', text: 'guidePagesHint' },
    { keys: ['Ctrl', '1–7'], title: 'guideJump', text: 'guideJumpHint' },
    { keys: ['Tab', 'Enter', 'Space', 'Esc'], title: 'guideControls', text: 'guideControlsHint' },
    { keys: ['←', '→', 'Shift', 'Home', 'End'], title: 'guideSliders', text: 'guideSlidersHint' },
  ] as const;
  const topics = [
    {
      id: 'typography',
      title: 'guideTypographyTitle',
      body: 'guideTypographyBody',
      steps: ['guideTypographyStep1', 'guideTypographyStep2', 'guideTypographyStep3'],
      video: typographyVideo,
      poster: typographyPoster,
      category: 'general',
    },
    {
      id: 'expression',
      title: 'guideExpressionTitle',
      body: 'guideExpressionBody',
      steps: ['guideExpressionStep1', 'guideExpressionStep2', 'guideExpressionStep3'],
      video: expressionVideo,
      poster: expressionPoster,
      category: 'general',
    },
    {
      id: 'glass',
      title: 'guideGlassTitle',
      body: 'guideGlassBody',
      steps: ['guideGlassStep1', 'guideGlassStep2', 'guideGlassStep3'],
      video: appearanceVideo,
      poster: appearancePoster,
      category: 'appearance',
    },
    {
      id: 'workflows',
      title: 'guideWorkflowTitle',
      body: 'guideWorkflowBody',
      steps: ['guideWorkflowStep1', 'guideWorkflowStep2', 'guideWorkflowStep3'],
      video: workflowVideo,
      poster: workflowPoster,
      category: 'shortcuts',
    },
    {
      id: 'ai',
      title: 'guideAITitle',
      body: 'guideAIBody',
      steps: ['guideAIStep1', 'guideAIStep2', 'guideAIStep3', 'guideAIStep4'],
      video: aiVideo,
      poster: aiPoster,
      category: 'integrations',
    },
  ] as const;
  return (
    <div className={styles.guide}>
      <section className={styles.intro}>
        <h1>{t('guideTitle')}</h1>
        <p>{t('guideIntro')}</p>
      </section>
      <PreferenceCard caption={t('guideKeyboard')}>
        <div className={styles.card}>
          {keys.map((row) => (
            <div className={styles.keyRow} key={row.title}>
              <div className={styles.keyCaps}>
                {row.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </div>
              <div>
                <strong>{t(row.title)}</strong>
                <p>{t(row.text)}</p>
              </div>
            </div>
          ))}
          <div className={styles.gesture}>
            <Command size={20} aria-hidden="true" />
            <p>{t('guideGestures')}</p>
          </div>
        </div>
      </PreferenceCard>
      <p className={styles.caption}>{t('guideRecordingNote')}</p>
      {topics.map((topic) => (
        <section key={topic.id} data-guide-topic={topic.id}>
          <PreferenceCard>
            <div className={styles.card}>
              <h2>{t(topic.title)}</h2>
              <p>{t(topic.body)}</p>
              <Recording src={topic.video} poster={topic.poster} label={t(topic.title)} />
              <ol>
                {topic.steps.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ol>
              {topic.id === 'ai' && (
                <p>
                  {t('guideAIVariables')} <code>{'{{product}}'}</code> <code>{'{{website}}'}</code>{' '}
                  <code>{'{{battery}}'}</code>
                </p>
              )}
              <button
                type="button"
                className={styles.openSettings}
                onClick={() => navigate(topic.category)}
              >
                {t('guideOpenSection')}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </PreferenceCard>
        </section>
      ))}
      <PreferenceCard caption={t('guideSettings')}>
        <div className={styles.card}>
          <p>{t('guideEditorHelp')}</p>
          <p>{t('guideSecrets')}</p>
          <p>{t('guideColors')}</p>
          <p>{t('guideReopen')}</p>
        </div>
      </PreferenceCard>
    </div>
  );
}
