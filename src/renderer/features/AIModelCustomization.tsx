import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModelCustomization, ModelCustomizationPatch } from '../../shared/aiConfiguration';
import type { AssistantContextPreview, PerceptionChannelId } from '../../shared/aiPerception';
import { perceptionChannelIds } from '../../shared/aiPerception';
import type { useAIConfiguration } from '../hooks/useAIConfiguration';
import { useBattery } from '../hooks/useBattery';
import { Select } from '../components/Select';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import {
  PreferenceCard,
  PreferenceGroup,
  PreferenceRow,
  PreferenceNumberField,
  PreferenceButton,
  PreferenceLink,
} from '../components/preferences';
import { detailEntryId, type SettingsDetail } from '../lib/settingsDetails';
import { AIField } from './AIField';
import styles from '../components/preferences/Preferences.module.css';

const perceptionLabels = {
  clock: ['perceptionClock', 'perceptionClockHint'],
  locale: ['perceptionLocale', 'perceptionLocaleHint'],
  place: ['perceptionPlace', 'perceptionPlaceHint'],
  host: ['perceptionHost', 'perceptionHostHint'],
  resources: ['perceptionResources', 'perceptionResourcesHint'],
  battery: ['perceptionBattery', 'perceptionBatteryHint'],
  music: ['perceptionMusic', 'perceptionMusicHint'],
  weather: ['perceptionWeather', 'perceptionWeatherHint'],
  diagnose: ['perceptionDiagnose', 'perceptionDiagnoseHint'],
  settings: ['perceptionSettings', 'perceptionSettingsHint'],
  desktop: ['perceptionDesktop', 'perceptionDesktopHint'],
} as const satisfies Record<PerceptionChannelId, readonly [string, string]>;

function perceptionDetail(channel: PerceptionChannelId, preview: AssistantContextPreview) {
  const values = preview.values;
  switch (channel) {
    case 'clock':
      return `Timezone: ${values.timezone}\nCurrent Time: ${values.current_time}`;
    case 'locale':
      return values.locale;
    case 'place':
      return values.location;
    case 'host':
      return `Operating System: ${values.os}\nArchitecture: ${values.arch}`;
    case 'resources':
      return `Memory: ${values.memory}\nStorage: ${values.storage}\nNetwork: ${values.network}`;
    case 'battery':
      return values.battery;
    case 'music':
      return values.music;
    case 'weather':
      return `Condition: ${values.weather}\nTemperature: ${values.temperature}`;
    case 'diagnose':
      return values.diagnose;
    case 'settings':
      return values.settings;
    case 'desktop':
      return '';
  }
}

function usePerceptionPreview() {
  const battery = useBattery();
  const [preview, setPreview] = useState<AssistantContextPreview | null>(null);
  useEffect(() => {
    const previewContext = window.electronAPI?.previewAssistantContext;
    if (!previewContext) return;
    let active = true;
    const percent = typeof battery.percent === 'number' ? battery.percent : null;
    void previewContext({ percent, charging: battery.charging })
      .then((value) => {
        if (active) setPreview(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [battery.percent, battery.charging]);
  return preview;
}

export function PerceptionChannelPage({ channel }: { channel: PerceptionChannelId }) {
  const { t } = useTranslation();
  const preview = usePerceptionPreview();
  const hint = perceptionLabels[channel][1];
  const text = preview && channel !== 'desktop' ? perceptionDetail(channel, preview) : '';
  return (
    <PreferenceCard>
      <div className={styles.prefStack}>
        <p className={styles.hint}>{t(hint)}</p>
        {text && (
          <>
            <span className={styles.label}>{t('perceptionCurrentValue')}</span>
            <pre className={styles.perceptionValue}>{text}</pre>
          </>
        )}
      </div>
    </PreferenceCard>
  );
}

export function AIModelCustomization({
  controller: p,
  id,
}: {
  controller: ReturnType<typeof useAIConfiguration>;
  id: number;
}) {
  const { t } = useTranslation();
  const [probing, setProbing] = useState(false);
  const [probeDetail, setProbeDetail] = useState<string | null>(null);
  const model = p.ai.models.find((item) => item.id === id);
  if (!model) return null;
  const endpoint = p.ai.endpoints.find((item) => item.id === model.endpointId);
  if (!endpoint) return null;
  const profile = model.customization;
  const update = (customization: ModelCustomizationPatch) =>
    void p.mutate({ kind: 'customize-model', id, customization });
  const efforts =
    endpoint.protocol === 'anthropic'
      ? ['default', 'low', 'medium', 'high', 'max']
      : ['default', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
  return (
    <>
      <PreferenceCard caption={t('visionCapability')}>
        <div className={styles.prefStack}>
          <PreferenceRow label={t('visionCapability')}>
            <Select
              label={t('visionCapability')}
              value={profile.vision}
              onValueChange={(value) => update({ vision: value as ModelCustomization['vision'] })}
              options={[
                { value: 'unknown', label: t('visionUnknown') },
                { value: 'supported', label: t('visionSupported') },
                { value: 'unsupported', label: t('visionUnsupported') },
              ]}
            />
          </PreferenceRow>
          <PreferenceButton
            variant="secondary"
            disabled={probing}
            onClick={() => {
              setProbing(true);
              setProbeDetail(null);
              void window.electronAPI
                .probeModelVision(id)
                .then((result) => {
                  if (result.status !== 'supported')
                    setProbeDetail(result.detail ?? t('probeVisionFailed'));
                })
                .catch((error) => {
                  setProbeDetail(error instanceof Error ? error.message : t('probeVisionFailed'));
                })
                .finally(() => setProbing(false));
            }}
          >
            {probing ? t('probingVision') : t('probeVision')}
          </PreferenceButton>
          {probeDetail && <p className={styles.hint}>{probeDetail}</p>}
        </div>
      </PreferenceCard>
      <PreferenceGroup caption={t('modelParameters')}>
        <PreferenceNumberField
          label={t('modelTemperature')}
          value={profile.temperature}
          min={0}
          max={endpoint.protocol === 'anthropic' ? 1 : 2}
          step={0.1}
          onChange={(temperature) => update({ temperature })}
        />
        <PreferenceRow label={t('reasoningEffort')}>
          <Select
            label={t('reasoningEffort')}
            value={profile.reasoningEffort}
            onValueChange={(value) =>
              update({ reasoningEffort: value as ModelCustomization['reasoningEffort'] })
            }
            options={efforts.map((value) => ({
              value,
              label: value === 'default' ? t('providerDefault') : value,
            }))}
          />
        </PreferenceRow>
        {endpoint.protocol === 'anthropic' && (
          <>
            <PreferenceRow label={t('thinkingMode')}>
              <Select
                label={t('thinkingMode')}
                value={profile.thinkingMode}
                onValueChange={(value) =>
                  update({
                    thinkingMode: value as ModelCustomization['thinkingMode'],
                    ...(value === 'budget'
                      ? {
                          thinkingBudget: profile.thinkingBudget ?? 1024,
                          maxOutputTokens: Math.max(
                            profile.maxOutputTokens ?? 4096,
                            (profile.thinkingBudget ?? 1024) + 4096,
                          ),
                        }
                      : {}),
                  })
                }
                options={['default', 'adaptive', 'budget', 'disabled'].map((value) => ({
                  value,
                  label: value === 'default' ? t('providerDefault') : value,
                }))}
              />
            </PreferenceRow>
            {profile.thinkingMode === 'budget' && (
              <PreferenceNumberField
                label={t('thinkingBudget')}
                value={profile.thinkingBudget}
                min={1024}
                max={Math.min(200000, (profile.maxOutputTokens ?? 1_000_000) - 1)}
                onChange={(thinkingBudget) => update({ thinkingBudget })}
              />
            )}
          </>
        )}
        <PreferenceNumberField
          label={t('maxOutputTokens')}
          value={profile.maxOutputTokens}
          min={profile.thinkingMode === 'budget' ? (profile.thinkingBudget ?? 1024) + 1 : 1}
          max={1_000_000}
          onChange={(maxOutputTokens) => update({ maxOutputTokens })}
        />
        <PreferenceNumberField
          label={t('contextLimitCharacters')}
          value={profile.contextLimitCharacters}
          min={100}
          max={4_000_000}
          onChange={(contextLimitCharacters) => update({ contextLimitCharacters })}
        />
        <p className={`${styles.hint} ${styles.groupHint}`}>{t('modelParametersHint')}</p>
      </PreferenceGroup>
    </>
  );
}

export function AISharedSettings({
  controller: p,
  navigate,
}: {
  controller: ReturnType<typeof useAIConfiguration>;
  navigate(detail: SettingsDetail): void;
}) {
  const { t } = useTranslation();
  const perception = p.ai.perception;
  return (
    <>
      <PreferenceCard caption={t('customInstruction')}>
        <div className={styles.prefStack}>
          <AIField
            label={t('customInstruction')}
            value={p.ai.instruction}
            multiline
            onChange={(instruction) => void p.mutate({ kind: 'edit-shared', instruction })}
          />
          <p className={styles.hint}>{t('customInstructionHint')}</p>
        </div>
      </PreferenceCard>
      <PreferenceGroup>
        {perceptionChannelIds.map((channel) => {
          const [label, hint] = perceptionLabels[channel];
          const next = { page: 'perceptionChannel' as const, channel };
          return (
            <div key={channel} className={styles.compactItem}>
              <PreferenceLink
                entry={detailEntryId(next)}
                label={t(label)}
                hint={t(hint)}
                onClick={() => navigate(next)}
              />
              <PreferenceSwitch
                label={t(label)}
                checked={perception[channel]}
                onCheckedChange={(enabled) =>
                  void p.mutate({ kind: 'edit-shared', perception: { [channel]: enabled } })
                }
              />
            </div>
          );
        })}
      </PreferenceGroup>
    </>
  );
}
