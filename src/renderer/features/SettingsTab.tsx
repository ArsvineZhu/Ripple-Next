import type { SettingsCategoryId } from '../lib/settingsCategories';
import { detailEntryId, type SettingsDetail } from '../lib/settingsDetails';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import { InlineNotices } from '../components/InlineNotices';
import { SettingsEditor } from './SettingsEditor';
import { SettingsGuide } from './SettingsGuide';
import { AIConfigurationEntries } from './AISettings';
import { SettingsGeneral } from './SettingsGeneral';
import { SettingsAppearance } from './SettingsAppearance';
import { SettingsBehavior } from './SettingsBehavior';
import { SettingsPages } from './SettingsPages';
import { SettingsShortcuts } from './SettingsShortcuts';
import { SettingsAbout } from './SettingsAbout';
import styles from '../components/preferences/Preferences.module.css';

interface Props {
  category: SettingsCategoryId;
  detail: SettingsDetail | null;
  onOpenDetail(detail: SettingsDetail): void;
  onBack(): void;
  onNavigateCategory(category: SettingsCategoryId): void;
}
export function SettingsTab({ category, detail, onOpenDetail, onBack, onNavigateCategory }: Props) {
  if (detail)
    return (
      <SettingsEditor
        key={detailEntryId(detail)}
        detail={detail}
        onOpenDetail={onOpenDetail}
        onBack={onBack}
      />
    );
  return (
    <ElasticScrollArea id="settings-container" className={styles.container}>
      {category === 'guide' && <SettingsGuide navigate={onNavigateCategory} />}
      {category === 'general' && <SettingsGeneral onOpenDetail={onOpenDetail} />}
      {category === 'appearance' && <SettingsAppearance onOpenDetail={onOpenDetail} />}
      {category === 'behavior' && <SettingsBehavior />}
      {category === 'pages' && <SettingsPages onOpenDetail={onOpenDetail} />}
      {category === 'shortcuts' && <SettingsShortcuts onOpenDetail={onOpenDetail} />}
      {category === 'integrations' && <AIConfigurationEntries navigate={onOpenDetail} />}
      {category === 'about' && <SettingsAbout onOpenDetail={onOpenDetail} />}
      <InlineNotices area="settings" codes={['stateSaveFailed']} />
    </ElasticScrollArea>
  );
}
