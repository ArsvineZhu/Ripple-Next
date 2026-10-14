import { OverlayProvider } from './components/OverlayProvider';
import { initializeI18n } from './i18n';
import { SettingsProvider } from './components/SettingsProvider';
import { AppStateProvider } from './components/AppStateProvider';
import { NotificationProvider } from './components/NotificationProvider';
import { createRoot } from 'react-dom/client';
import Island from './Island';
import SettingsApp from './SettingsApp';
import { installRendererErrorHandlers, rendererRootErrorHandlers } from './lib/diagnostics';
import './styles/base.css';
import './styles/tokens.css';
import './styles/fonts.css';
installRendererErrorHandlers(window);
const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
const bootstrap = await window.electronAPI.getAppBootstrap();
await initializeI18n(bootstrap.state.settings.language);
const isSettingsView =
  window.location.hash === '#settings' ||
  new URLSearchParams(window.location.search).get('view') === 'settings';
createRoot(container, rendererRootErrorHandlers).render(
  <NotificationProvider>
    <AppStateProvider initialState={bootstrap.state}>
      <SettingsProvider hasWeatherApiKey={bootstrap.hasWeatherApiKey}>
        <OverlayProvider>{isSettingsView ? <SettingsApp /> : <Island />}</OverlayProvider>
      </SettingsProvider>
    </AppStateProvider>
  </NotificationProvider>,
);
