import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { name: 'Ripple Next' },
  Menu: { setApplicationMenu: vi.fn(), buildFromTemplate: vi.fn() },
}));

const { buildAppMenuTemplate } = await import('../../src/main/appMenu');

describe('app menu', () => {
  it('puts Settings… in the App menu with the standard Command-Comma shortcut', () => {
    const onOpenSettings = vi.fn();
    const template = buildAppMenuTemplate({ appName: 'Ripple Next', onOpenSettings });
    const items = (template[0].submenu ?? []) as {
      label?: string;
      accelerator?: string;
      click?: () => void;
    }[];
    const settings = items.find((item) => item.label === 'Settings…');
    expect(settings).toBeDefined();
    expect(settings?.accelerator).toBe('CommandOrControl+,');
    settings?.click?.();
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
