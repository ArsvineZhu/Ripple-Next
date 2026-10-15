import { app, Menu } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';

/**
 * HIG: "Include a settings item in the App menu" and "Make settings available in ways people
 * expect … people often use the standard Command-Comma (,) keyboard shortcut". macOS gets a real
 * application menu; other platforms keep Electron's default menu, since their windows do not need a
 * menu bar of their own.
 */
export function buildAppMenuTemplate(input: {
  appName: string;
  onOpenSettings: () => void;
}): MenuItemConstructorOptions[] {
  return [
    {
      label: input.appName,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings…',
          accelerator: 'CommandOrControl+,',
          click: () => input.onOpenSettings(),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
}

export function installAppMenu(onOpenSettings: () => void) {
  if (process.platform !== 'darwin') return;
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(buildAppMenuTemplate({ appName: app.name, onOpenSettings })),
  );
}
