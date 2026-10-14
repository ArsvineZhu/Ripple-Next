import {
  PreferenceIconButton,
  PreferenceReveal,
  PreferenceGroup,
  PreferenceCard,
  PreferenceRow,
  SettingLink,
} from '../components/preferences';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  EyeOff,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Star,
  CloudSun,
  Thermometer,
} from 'lucide-react';
import { TABS, islandPages } from '../lib/tabs';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { type SettingsDetail } from '../lib/settingsDetails';
import styles from '../components/preferences/Preferences.module.css';
import { useSettingsContext } from '../components/SettingsProvider';

export function SettingsPages({ onOpenDetail }: { onOpenDetail(detail: SettingsDetail): void }) {
  const { t } = useTranslation();
  const p = useSettingsContext();
  const { hiddenTabs, defaultTabId } = p.settings;
  const tabOrder = islandPages.orderedIds(p.settings.tabOrder);
  const moveTabOrder = (from: number, to: number) => {
    if (
      !Number.isInteger(from) ||
      from < 0 ||
      from >= tabOrder.length ||
      to < 0 ||
      to >= tabOrder.length ||
      from === to
    )
      return;
    const next = [...tabOrder],
      [moved] = next.splice(from, 1);
    if (moved !== undefined) next.splice(to, 0, moved);
    p.updateSettings({ tabOrder: next });
  };
  const toggleTabVisibility = (id: string) => {
    const next = hiddenTabs.includes(id)
      ? hiddenTabs.filter((value) => value !== id)
      : [...hiddenTabs, id];
    if (tabOrder.some((value) => !next.includes(value))) p.updateSettings({ hiddenTabs: next });
  };
  return (
    <>
      <PreferenceCard caption={t('tabManagement')}>
        <p className={styles.prefCardHint}>{t('tabInstructions')}</p>
        <div className={styles.tabList}>
          {tabOrder.map((id, index) => {
            const tab = TABS.find((item) => item.id === id);
            if (!tab) return null;
            const hidden = hiddenTabs.includes(id);
            const visibilityLabel = t(hidden ? 'show' : 'hide');
            return (
              <div
                key={id}
                className={`${styles.tabItem} ${hidden ? styles.hidden : ''}`}
                draggable
                data-island-interactive
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', String(index));
                  event.currentTarget.dataset.dragging = 'true';
                }}
                onDragEnd={(event) => {
                  delete event.currentTarget.dataset.dragging;
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.currentTarget.dataset.dropTarget = 'true';
                }}
                onDragLeave={(event) => {
                  delete event.currentTarget.dataset.dropTarget;
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  delete event.currentTarget.dataset.dropTarget;
                  moveTabOrder(Number(event.dataTransfer.getData('text/plain')), index);
                }}
              >
                <GripVertical size={14} className={styles.grip} />
                {tab.icon(p.settings.textColor)}
                <span className={styles.tabName}>
                  {tab.title ?? t(tab.nameKey ?? 'tabOverview')}
                </span>
                <PreferenceIconButton
                  label={t('defaultTab')}
                  onClick={() => {
                    p.updateSettings({ defaultTabId: id });
                  }}
                >
                  <Star
                    size={15}
                    fill={defaultTabId === id ? '#ffd700' : 'none'}
                    color={defaultTabId === id ? '#ffd700' : 'currentColor'}
                  />
                </PreferenceIconButton>
                <PreferenceIconButton
                  label={visibilityLabel}
                  onClick={() => toggleTabVisibility(id)}
                >
                  {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                </PreferenceIconButton>
                <PreferenceIconButton
                  disabled={index === 0}
                  label={t('moveTabUp')}
                  onClick={() => moveTabOrder(index, index - 1)}
                >
                  <ChevronUp size={15} />
                </PreferenceIconButton>
                <PreferenceIconButton
                  disabled={index === tabOrder.length - 1}
                  label={t('moveTabDown')}
                  onClick={() => moveTabOrder(index, index + 1)}
                >
                  <ChevronDown size={15} />
                </PreferenceIconButton>
              </div>
            );
          })}
        </div>
      </PreferenceCard>
      <PreferenceGroup caption={t('browserSearchSettings')}>
        <SettingLink
          detail={{ page: 'searchTemplate' }}
          label={t('searchEngineUrl')}
          value={p.settings.searchUrlTemplate}
          navigate={onOpenDetail}
        />
      </PreferenceGroup>
      <PreferenceGroup caption={t('weather')}>
        <PreferenceRow
          icon={CloudSun}
          label={t('useBuiltInWeatherApi')}
          hint={t('useBuiltInWeatherApiHint')}
        >
          <PreferenceSwitch
            label={t('useBuiltInWeatherApi')}
            checked={p.settings.weather.keySource === 'builtin'}
            onCheckedChange={(checked) =>
              p.updateSettings({
                weather: { ...p.settings.weather, keySource: checked ? 'builtin' : 'custom' },
              })
            }
          />
        </PreferenceRow>
        <PreferenceReveal visible={p.settings.weather.keySource === 'custom'}>
          <SettingLink
            detail={{ page: 'weatherApiKey' }}
            label={t('weatherApiKey')}
            value={p.hasWeatherApiKey ? '••••••••' : t('notConfigured')}
            navigate={onOpenDetail}
          />
        </PreferenceReveal>
        <SettingLink
          detail={{ page: 'weatherLocation' }}
          label={t('location')}
          value={
            p.settings.weather.location.mode === 'automatic'
              ? t('automaticLocation')
              : [
                  p.settings.weather.location.city,
                  p.settings.weather.location.region,
                  p.settings.weather.location.country,
                ]
                  .filter(Boolean)
                  .join(', ') || t('notConfigured')
          }
          navigate={onOpenDetail}
        />
        <PreferenceRow icon={Thermometer} label={t('unit')} hint={t('unitHint')}>
          <PreferenceSwitch
            label={t('unit')}
            checked={p.settings.weather.unit === 'c'}
            onCheckedChange={(checked) =>
              p.updateSettings({
                weather: { ...p.settings.weather, unit: checked ? 'c' : 'f' },
              })
            }
          />
        </PreferenceRow>
      </PreferenceGroup>
    </>
  );
}
