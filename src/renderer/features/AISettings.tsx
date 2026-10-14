import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Network, KeyRound, Brain, SlidersHorizontal } from 'lucide-react';
import { Select } from '../components/Select';
import type { AIProtocol } from '../../shared/aiConfiguration';
import type { SettingsDetail } from '../lib/settingsDetails';
import { detailEntryId } from '../lib/settingsDetails';
import type { useAIConfiguration } from '../hooks/useAIConfiguration';
import { PrefCard, PrefGroup, PrefRow, PreferenceLink } from './SettingsPreferences';
import { AIModelCustomization } from './AIModelCustomization';
import { AIField } from './AIField';
import { DangerAction } from '../components/DangerAction';
import styles from './SettingsTab.module.css';
import { aiDisplayLabel, aiDisplayNumber } from '../lib/aiDisplay';

type Controller = ReturnType<typeof useAIConfiguration>;
const protocolLabels: Record<AIProtocol, string> = {
  completion: 'OpenAI · Chat Completions',
  responses: 'OpenAI · Responses',
  anthropic: 'Anthropic',
};
function Remove({ label, onRemove }: { label: string; onRemove(): void }) {
  return <DangerAction label={label} onConfirm={onRemove} />;
}
export function AIConfigurationEntries({
  controller: p,
  navigate,
}: {
  controller: Controller;
  navigate(detail: SettingsDetail): void;
}) {
  const { t } = useTranslation();
  const links = [
    {
      page: 'aiEndpoints' as const,
      icon: Network,
      label: 'aiBaseUrlConfig' as const,
      hint: 'aiBaseUrlConfigHint' as const,
      count: p.ai.endpoints.length,
    },
    {
      page: 'aiCredentials' as const,
      icon: KeyRound,
      label: 'aiKeysConfig' as const,
      hint: 'aiKeysConfigHint' as const,
      count: p.ai.credentials.length,
    },
    {
      page: 'aiModels' as const,
      icon: Brain,
      label: 'aiModelsConfig' as const,
      hint: 'aiModelsConfigHint' as const,
      count: p.ai.models.length,
    },
    {
      page: 'aiCustomizations' as const,
      icon: SlidersHorizontal,
      label: 'aiModelCustomization' as const,
      hint: 'aiModelCustomizationHint' as const,
      count: undefined,
    },
  ];
  const ready = p.ai.models.filter(
    (model) => model.name && model.credentialId !== null && p.status[model.credentialId],
  );
  return (
    <>
      <PrefGroup>
        {links.map((link) => (
          <PreferenceLink
            key={link.page}
            label={t(link.label)}
            icon={link.icon}
            hint={t(link.hint)}
            value={link.count === undefined ? undefined : String(link.count)}
            entry={link.page}
            onClick={() => navigate({ page: link.page })}
          />
        ))}
      </PrefGroup>
      <PrefGroup>
        <PrefRow label={t('activeAIModel')}>
          <Select
            label={t('activeAIModel')}
            value={p.ai.activeModelId === null ? 'none' : String(p.ai.activeModelId)}
            onValueChange={(value) =>
              void p.mutate({ kind: 'select-model', id: value === 'none' ? null : Number(value) })
            }
            options={[
              { value: 'none', label: t('notConfigured') },
              ...ready.map((model) => ({
                value: String(model.id),
                label: aiDisplayLabel(p.ai.models, model, model.name),
              })),
            ]}
          />
        </PrefRow>
      </PrefGroup>
    </>
  );
}
export function AISettingsPage({
  controller: p,
  detail,
  navigate,
}: {
  controller: Controller;
  detail: SettingsDetail;
  navigate(detail: SettingsDetail): void;
}) {
  const { t } = useTranslation();
  const [protocol, setProtocol] = useState<AIProtocol>('completion');
  const [endpointId, setEndpointId] = useState(p.ai.endpoints[0]?.id ?? 0);
  const [credentialId, setCredentialId] = useState(0);
  const endpointOptions = p.ai.endpoints.map((item) => ({
    value: String(item.id),
    label: aiDisplayLabel(p.ai.endpoints, item, protocolLabels[item.protocol]),
    description: item.baseUrl,
  }));
  const entry = (next: SettingsDetail, label: string, value?: string, hint?: string) => (
    <PreferenceLink
      entry={detailEntryId(next)}
      label={label}
      value={value}
      hint={hint}
      onClick={() => navigate(next)}
    />
  );
  const add = (label: string, disabled: boolean, action: () => void) => (
    <button type="button" className={styles.addRowButton} disabled={disabled} onClick={action}>
      <Plus size={16} />
      {label}
    </button>
  );
  if (detail.page === 'aiEndpoints')
    return (
      <>
        <PrefCard>
          <div className={styles.prefStack}>
            <PrefRow label={t('aiProtocol')}>
              <Select
                label={t('aiProtocol')}
                value={protocol}
                options={Object.entries(protocolLabels).map(([value, label]) => ({ value, label }))}
                onValueChange={(value) => setProtocol(value as AIProtocol)}
              />
            </PrefRow>
            {add(
              t('addBaseUrl'),
              false,
              () =>
                void p.mutate({ kind: 'add-endpoint', protocol }).then((state) => {
                  const item = state?.settings.ai.endpoints.at(-1);
                  if (item) navigate({ page: 'aiEndpoint', id: item.id });
                }),
            )}
          </div>
        </PrefCard>
        <PrefGroup>
          {p.ai.endpoints.map((item) => (
            <div className={styles.compactItem} key={item.id}>
              {entry(
                { page: 'aiEndpoint', id: item.id },
                aiDisplayLabel(p.ai.endpoints, item, protocolLabels[item.protocol]),
                protocolLabels[item.protocol],
                item.baseUrl,
              )}
              <Remove
                label={t('removeBaseUrl', { count: aiDisplayNumber(p.ai.endpoints, item.id) })}
                onRemove={() => void p.mutate({ kind: 'remove-endpoint', id: item.id })}
              />
            </div>
          ))}
        </PrefGroup>
      </>
    );
  if (detail.page === 'aiCredentials')
    return (
      <>
        <PrefCard>
          <div className={styles.prefStack}>
            <PrefRow label={t('selectBaseUrl')}>
              <Select
                label={t('selectBaseUrl')}
                value={String(endpointId)}
                onValueChange={(value) => setEndpointId(Number(value))}
                options={endpointOptions}
              />
            </PrefRow>
            <p className={styles.hint}>{t('aiKeysConfigHint')}</p>
            {add(
              t('addApiKey'),
              !endpointId,
              () =>
                void p.mutate({ kind: 'add-credential', endpointId }).then((state) => {
                  const item = state?.settings.ai.credentials.at(-1);
                  if (item) navigate({ page: 'aiCredential', id: item.id });
                }),
            )}
          </div>
        </PrefCard>
        <PrefGroup>
          {p.ai.credentials.map((item) => (
            <div className={styles.compactItem} key={item.id}>
              {entry(
                { page: 'aiCredential', id: item.id },
                aiDisplayLabel(p.ai.credentials, item, t('apiKey')),
                p.status[item.id] ? '••••••••' : t('notConfigured'),
                `${t('baseUrlNumber', { count: aiDisplayNumber(p.ai.endpoints, item.endpointId) })}`,
              )}
              <Remove
                label={t('removeApiCredential', {
                  count: aiDisplayNumber(p.ai.credentials, item.id),
                })}
                onRemove={() => void p.mutate({ kind: 'remove-credential', id: item.id })}
              />
            </div>
          ))}
        </PrefGroup>
      </>
    );
  if (detail.page === 'aiModels')
    return (
      <>
        <PrefCard>
          <div className={styles.prefStack}>
            <PrefRow label={t('selectBaseUrl')}>
              <Select
                label={t('selectBaseUrl')}
                value={String(endpointId)}
                onValueChange={(value) => {
                  setEndpointId(Number(value));
                  setCredentialId(0);
                }}
                options={endpointOptions}
              />
            </PrefRow>
            <PrefRow label={t('selectApiKey')}>
              <Select
                label={t('selectApiKey')}
                value={String(credentialId)}
                onValueChange={(value) => setCredentialId(Number(value))}
                options={p.ai.credentials
                  .filter((item) => item.endpointId === endpointId && p.status[item.id])
                  .map((item) => ({
                    value: String(item.id),
                    label: aiDisplayLabel(p.ai.credentials, item, t('apiKey')),
                  }))}
              />
            </PrefRow>
            <p className={styles.hint}>{t('aiModelsConfigHint')}</p>
            {add(
              t('addModel'),
              !endpointId || !credentialId,
              () =>
                void p.mutate({ kind: 'add-model', endpointId, credentialId }).then((state) => {
                  const item = state?.settings.ai.models.at(-1);
                  if (item) navigate({ page: 'aiModel', id: item.id });
                }),
            )}
          </div>
        </PrefCard>
        <PrefGroup>
          {p.ai.models.map((item) => (
            <div className={styles.compactItem} key={item.id}>
              {entry(
                { page: 'aiModel', id: item.id },
                aiDisplayLabel(p.ai.models, item, item.name || t('unnamedModel')),
                item.id === p.ai.activeModelId ? t('activeAIModel') : undefined,
                `${t('baseUrlNumber', { count: aiDisplayNumber(p.ai.endpoints, item.endpointId) })} · ${item.name}`,
              )}
              <Remove
                label={t('removeAIModel', { count: aiDisplayNumber(p.ai.models, item.id) })}
                onRemove={() => void p.mutate({ kind: 'remove-model', id: item.id })}
              />
            </div>
          ))}
        </PrefGroup>
      </>
    );
  if (detail.page === 'aiCustomizations')
    return (
      <PrefGroup caption={t('selectModelFirst')}>
        {p.ai.models
          .filter((item) => item.name)
          .map((item) => (
            <div key={item.id}>
              {entry(
                { page: 'aiCustomization', id: item.id },
                aiDisplayLabel(p.ai.models, item, item.name),
                undefined,
                t('baseUrlNumber', { count: aiDisplayNumber(p.ai.endpoints, item.endpointId) }),
              )}
            </div>
          ))}
      </PrefGroup>
    );
  if (!('id' in detail)) return null;
  if (detail.page === 'aiEndpoint') {
    const item = p.ai.endpoints.find((value) => value.id === detail.id);
    if (!item) return null;
    return (
      <PrefCard>
        <div className={styles.prefStack}>
          <PrefRow label={t('aiProtocol')}>
            <span>{`#${aiDisplayNumber(p.ai.endpoints, item.id)} · ${protocolLabels[item.protocol]}`}</span>
          </PrefRow>
          <AIField
            label={t('configurationName')}
            value={item.label}
            onChange={(label) => void p.mutate({ kind: 'edit-endpoint', id: item.id, label })}
          />
          <AIField
            label="Base URL"
            value={item.baseUrl}
            valid={(value) => {
              try {
                const url = new URL(value);
                return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
              } catch {
                return false;
              }
            }}
            onChange={(baseUrl) => void p.mutate({ kind: 'edit-endpoint', id: item.id, baseUrl })}
          />
        </div>
      </PrefCard>
    );
  }
  if (detail.page === 'aiCredential') {
    const item = p.ai.credentials.find((value) => value.id === detail.id);
    if (!item) return null;
    const endpoint = p.ai.endpoints.find((value) => value.id === item.endpointId);
    return (
      <CredentialEditor
        key={item.id}
        controller={p}
        id={item.id}
        label={item.label}
        endpoint={`${t('baseUrlNumber', { count: aiDisplayNumber(p.ai.endpoints, item.endpointId) })} · ${endpoint?.baseUrl ?? ''}`}
      />
    );
  }
  if (detail.page === 'aiModel') {
    const item = p.ai.models.find((value) => value.id === detail.id);
    if (!item) return null;
    return <ModelEditor key={item.id} controller={p} id={item.id} />;
  }
  if (detail.page === 'aiCustomization')
    return <AIModelCustomization controller={p} id={detail.id} />;
  return null;
}
function CredentialEditor({
  controller: p,
  id,
  label,
  endpoint,
}: {
  controller: Controller;
  id: number;
  label: string;
  endpoint: string;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (value: string) => {
    setBusy(true);
    try {
      if (await p.saveCredential(id, value)) setDraft('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <PrefCard>
      <form
        className={styles.prefStack}
        onSubmit={(e) => {
          e.preventDefault();
          void save(draft);
        }}
      >
        <p className={styles.bindingSummary}>{endpoint}</p>
        <AIField
          label={t('configurationName')}
          value={label}
          onChange={(name) => void p.mutate({ kind: 'edit-credential', id, label: name })}
        />
        <label className={styles.fieldLabel} htmlFor={inputId}>
          {t('apiKey')}
          <span className={styles.hint}>{t('apiKeyManualHint')}</span>
        </label>
        <div className={styles.editRow}>
          <input
            id={inputId}
            type="password"
            autoComplete="new-password"
            className={styles.input}
            placeholder={p.status[id] ? '••••••••' : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
          />
          <button type="submit" className={styles.primaryButton} disabled={busy || !draft.trim()}>
            {t(p.status[id] ? 'changeApiKey' : 'saveApiKey')}
          </button>
        </div>
        {p.status[id] && (
          <DangerAction label={t('removeApiKey')} disabled={busy} onConfirm={() => save('')}>
            {t('removeApiKey')}
          </DangerAction>
        )}
      </form>
    </PrefCard>
  );
}
function ModelEditor({ controller: p, id }: { controller: Controller; id: number }) {
  const { t } = useTranslation();
  const model = p.ai.models.find((item) => item.id === id)!;
  const [endpointId, setEndpointId] = useState(model.endpointId);
  const [keyId, setKeyId] = useState(model.credentialId ?? 0);
  const update = (patch: { name?: string; label?: string }, key = keyId) =>
    void p.mutate({ kind: 'edit-model', id, endpointId, credentialId: key, ...patch });
  return (
    <PrefCard>
      <div className={styles.prefStack}>
        <PrefRow label={t('selectBaseUrl')}>
          <Select
            label={t('selectBaseUrl')}
            value={String(endpointId)}
            onValueChange={(value) => {
              setEndpointId(Number(value));
              setKeyId(0);
            }}
            options={p.ai.endpoints.map((item) => ({
              value: String(item.id),
              label: aiDisplayLabel(p.ai.endpoints, item, protocolLabels[item.protocol]),
            }))}
          />
        </PrefRow>
        <PrefRow label={t('selectApiKey')}>
          <Select
            label={t('selectApiKey')}
            value={String(keyId)}
            onValueChange={(value) => {
              const key = Number(value);
              setKeyId(key);
              update({}, key);
            }}
            options={p.ai.credentials
              .filter((item) => item.endpointId === endpointId && p.status[item.id])
              .map((item) => ({
                value: String(item.id),
                label: aiDisplayLabel(p.ai.credentials, item, t('apiKey')),
              }))}
          />
        </PrefRow>
        {keyId ? (
          <>
            <AIField
              label={t('aiModel')}
              value={model.name}
              onChange={(name) => update({ name })}
            />
            <AIField
              label={t('configurationName')}
              value={model.label}
              onChange={(label) => update({ label })}
            />
          </>
        ) : (
          <p className={styles.hint}>{t('selectModelBindingFirst')}</p>
        )}
        <p className={styles.hint}>{t('aiModelHint')}</p>
      </div>
    </PrefCard>
  );
}
