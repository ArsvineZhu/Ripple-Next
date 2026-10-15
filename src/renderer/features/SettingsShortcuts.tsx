import { useTranslation } from 'react-i18next';
import { InlineNotices } from '../components/InlineNotices';
import { DangerAction } from '../components/DangerAction';
import { PreferenceGroup, SettingLink } from '../components/preferences';
import { type SettingsDetail } from '../lib/settingsDetails';
import styles from '../components/preferences/Preferences.module.css';
import { useAppState } from '../components/AppStateProvider';

export function SettingsShortcuts({
  onOpenDetail,
}: {
  onOpenDetail(detail: SettingsDetail): void;
}) {
  const { t } = useTranslation();
  const { state, updateState } = useAppState();
  return (
    <>
      <PreferenceGroup caption={t('quickApps')}>
        {state.quickApps.map((app) => (
          <div className={styles.compactItem} key={app.id}>
            <SettingLink
              detail={{ page: 'quickAppName', appId: app.id }}
              label={app.name}
              navigate={onOpenDetail}
            />
            <DangerAction
              label={t('removeApp', { name: app.name })}
              onConfirm={() =>
                updateState({ quickApps: state.quickApps.filter((item) => item.id !== app.id) })
              }
            />
          </div>
        ))}
        <SettingLink
          detail={{ page: 'addQuickApp' }}
          label={t('addApp')}
          value={undefined}
          hint={state.quickApps.length ? undefined : t('quickAppEditorHint')}
          navigate={onOpenDetail}
        />
      </PreferenceGroup>
      <InlineNotices area="quick-apps" />
      <PreferenceGroup caption={t('manageWorkflows')}>
        {state.workflows.map((workflow, index) => (
          <div className={styles.compactItem} key={index}>
            <SettingLink
              detail={{ page: 'workflow', index }}
              label={workflow.name}
              value={t('items', { count: workflow.targets.length })}
              navigate={onOpenDetail}
            />
            <DangerAction
              label={t('removeWorkflow', { name: workflow.name })}
              onConfirm={() =>
                updateState({ workflows: state.workflows.filter((_, i) => i !== index) })
              }
            />
          </div>
        ))}
        <SettingLink
          detail={{ page: 'addWorkflow' }}
          label={t('addWorkflow')}
          value={undefined}
          hint={state.workflows.length ? undefined : t('workflowEditorHint')}
          navigate={onOpenDetail}
        />
      </PreferenceGroup>
    </>
  );
}
