import { messages, resolveLocale } from '../shared/i18n';
import type { Locale } from '../shared/i18n';
import { app, Menu, nativeImage, Tray } from 'electron';
import { getIconPath } from './assets';
import { getMainWindow, showMainWindow } from './window';
import { openSettingsWindow } from './settingsWindow';
let tray: Tray | null = null;
export const hasTray = () => tray !== null;
let locale: Locale;
export function setTrayLocale(value: Locale) {
  locale = value;
  updateTrayMenu();
}
function updateTrayMenu() {
  if (!tray) return;
  const t = messages[locale];
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: t.openSettings,
        click: () => {
          openSettingsWindow();
        },
      },
      {
        label: t.trayToggle,
        click: () => {
          const window = getMainWindow();
          if (window?.isVisible()) window.hide();
          else showMainWindow(true);
        },
      },
      { type: 'separator' },
      { label: t.quit, click: () => app.quit() },
    ]),
  );
}
function createTray() {
  if (tray) return;
  locale = locale || resolveLocale('system', app.getLocale());
  tray = new Tray(nativeImage.createFromPath(getIconPath()).resize({ width: 16, height: 16 }));
  tray.setToolTip('Ripple Next');
  updateTrayMenu();
}

function destroyTray() {
  tray?.destroy();
  tray = null;
}

/** macOS reads settings.showTray; Windows/Linux callers always pass true. */
export function setTrayVisible(visible: boolean) {
  if (visible) createTray();
  else destroyTray();
}
