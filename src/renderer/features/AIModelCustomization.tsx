import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import type { ModelCustomization } from '../../shared/aiConfiguration';
import type { useAIConfiguration } from '../hooks/useAIConfiguration';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import { Select } from '../components/Select';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import {
  PreferenceCard,
  PreferenceGroup,
  PreferenceRow,
  PreferenceNumberField,
} from '../components/preferences';
import { AIField } from './AIField';
import styles from '../components/preferences/Preferences.module.css';
import { aiDisplayLabel, aiDisplayNumber } from '../lib/aiDisplay';
import { DangerAction } from '../components/DangerAction';

export function AIModelCustomization({
  controller: p,
  id,
}: {
  controller: ReturnType<typeof useAIConfiguration>;
  id: number;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPreference();
  const model = p.ai.models.find((item) => item.id === id);
  if (!model) return null;
  const endpoint = p.ai.endpoints.find((item) => item.id === model.endpointId);
  if (!endpoint) return null;
  const profile = model.customization;
  const update = (customization: Partial<ModelCustomization>) =>
    void p.mutate({ kind: 'customize-model', id, customization });
  const injections = profile.injections;
  const updateInjection = (
    injectionId: string,
    patch: { name?: string; text?: string; enabled?: boolean },
  ) => void p.mutate({ kind: 'edit-injection', id, injectionId, ...patch });
  const efforts =
    endpoint.protocol === 'anthropic'
      ? ['default', 'low', 'medium', 'high', 'max']
      : ['default', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
  return (
    <>
      <PreferenceCard>
        <div className={styles.prefStack}>
          <span className={styles.label}>{aiDisplayLabel(p.ai.models, model, model.name)}</span>
          <p
            className={styles.bindingSummary}
          >{`${t('baseUrlNumber', { count: aiDisplayNumber(p.ai.endpoints, endpoint.id) })}: ${endpoint.baseUrl}`}</p>
          <p className={styles.bindingSummary}>{`${t('aiModel')}: ${model.name}`}</p>
          <p className={styles.hint}>{t('aiModelBindingLocked')}</p>
        </div>
      </PreferenceCard>
      <PreferenceCard caption={t('systemPrompt')}>
        <div className={styles.prefStack}>
          <PreferenceRow label={t('useDefaultSystemPrompt')}>
            <PreferenceSwitch
              label={t('useDefaultSystemPrompt')}
              checked={profile.systemPrompt === null}
              onCheckedChange={(value) => update({ systemPrompt: value ? null : '' })}
            />
          </PreferenceRow>
          <AnimatePresence initial={false}>
            {profile.systemPrompt !== null && (
              <motion.div
                key="system-prompt"
                className={styles.animatedFields}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
              >
                <AIField
                  label={t('systemPrompt')}
                  value={profile.systemPrompt}
                  multiline
                  onChange={(systemPrompt) => update({ systemPrompt })}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <p className={styles.hint}>
            {t('promptVariablesHint', {
              variables: '{{product}}, {{version}}, {{timezone}}, {{current_time}}',
            })}
          </p>
        </div>
      </PreferenceCard>
      <PreferenceCard caption={t('injectionList')}>
        <div className={styles.prefStack}>
          <p className={styles.hint}>{t('injectionsHint')}</p>
          <AnimatePresence initial={false}>
            {injections.map((item, index) => (
              <motion.div
                key={item.id}
                className={styles.injectionItem}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
              >
                <div className={styles.row}>
                  <span className={styles.label}>{`#${index + 1}`}</span>
                  <PreferenceSwitch
                    label={t('enableInjection', { count: index + 1 })}
                    checked={item.enabled}
                    onCheckedChange={(enabled) => updateInjection(item.id, { enabled })}
                  />
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={index === 0}
                    aria-label={t('moveInjectionUp')}
                    onClick={() =>
                      void p.mutate({
                        kind: 'move-injection',
                        id,
                        injectionId: item.id,
                        direction: -1,
                      })
                    }
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={index === injections.length - 1}
                    aria-label={t('moveInjectionDown')}
                    onClick={() =>
                      void p.mutate({
                        kind: 'move-injection',
                        id,
                        injectionId: item.id,
                        direction: 1,
                      })
                    }
                  >
                    <ArrowDown size={16} />
                  </button>
                  <DangerAction
                    label={`${t('removeInjection')} #${index + 1}${item.name ? ` · ${item.name}` : ''}`}
                    onConfirm={() =>
                      p.mutate({ kind: 'remove-injection', id, injectionId: item.id })
                    }
                  >
                    <X size={16} />
                  </DangerAction>
                </div>
                <AIField
                  label={t('injectionName')}
                  value={item.name}
                  onChange={(name) => updateInjection(item.id, { name })}
                />
                <AIField
                  label={t('injectionText')}
                  value={item.text}
                  multiline
                  onChange={(text) => updateInjection(item.id, { text })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            type="button"
            className={styles.addRowButton}
            onClick={() => void p.mutate({ kind: 'add-injection', id })}
          >
            <Plus size={16} />
            {t('addInjection')}
          </button>
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
        <PreferenceRow label={t('contextAwareness')} hint={t('contextAwarenessReserved')}>
          <PreferenceSwitch
            label={t('contextAwareness')}
            checked={false}
            disabled
            onCheckedChange={() => {}}
          />
        </PreferenceRow>
      </PreferenceGroup>
    </>
  );
}
