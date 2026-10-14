import { OverlayProvider } from './components/OverlayProvider';
import { initializeI18n } from './i18n';
import { SettingsProvider } from './components/SettingsProvider';
import { AppStateProvider } from './components/AppStateProvider';
import { NotificationProvider } from './components/NotificationProvider';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';
import Island from './Island';
import SettingsApp from './SettingsApp';
import { installRendererErrorHandlers, rendererRootErrorHandlers } from './lib/diagnostics';
import './styles/base.css';
import './styles/tokens.css';
import './styles/fonts.css';
import startupStyles from './styles/StartupError.module.css';
installRendererErrorHandlers(window);
const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
const root = createRoot(container, rendererRootErrorHandlers);
function StartupError({ detail }: { detail: string }) {
  const { t } = useTranslation();
  return (
    <main className={startupStyles.panel} role="alert">
      <h1>Ripple Next</h1>
      <p>{t('stateLoadFailed')}</p>
      <p className={startupStyles.detail}>{detail}</p>
      <button type="button" onClick={() => void window.electronAPI.openDiagnosticsFolder()}>
        {t('openDiagnosticsFolder')}
      </button>
    </main>
  );
}
try {
  const bootstrap = await window.electronAPI.getAppBootstrap();
  await initializeI18n(bootstrap.state.settings.language);
  const isSettingsView =
    window.location.hash === '#settings' ||
    new URLSearchParams(window.location.search).get('view') === 'settings';
  root.render(
    <NotificationProvider>
      <AppStateProvider initialState={bootstrap.state}>
        <SettingsProvider hasWeatherApiKey={bootstrap.hasWeatherApiKey}>
          <OverlayProvider>{isSettingsView ? <SettingsApp /> : <Island />}</OverlayProvider>
        </SettingsProvider>
      </AppStateProvider>
    </NotificationProvider>,
  );
} catch (error) {
  await initializeI18n('system');
  root.render(<StartupError detail={error instanceof Error ? error.message : String(error)} />);
}
