import type { WebContents } from 'electron';

export type WindowRole = 'island' | 'settings';

type RoleEntry = { role: WindowRole; webContents: WebContents };

const entries = new Map<number, RoleEntry>();

/** Remember which BrowserWindow role owns a WebContents for IPC allowlisting and delivery. */
export function registerWindowRole(webContents: WebContents, role: WindowRole): void {
  const id = webContents.id;
  entries.set(id, { role, webContents });
  webContents.once('destroyed', () => {
    const current = entries.get(id);
    if (current?.webContents === webContents) entries.delete(id);
  });
}

export function getWindowRole(sender: WebContents): WindowRole | null {
  const entry = entries.get(sender.id);
  return entry?.webContents === sender ? entry.role : null;
}

/** Island and settings windows may call IPC; every other sender is rejected. */
export function isAllowedIpcSender(sender: WebContents): boolean {
  return getWindowRole(sender) !== null;
}

export function getWebContentsForRole(role: WindowRole): WebContents | null {
  for (const entry of entries.values()) {
    if (entry.role === role && !entry.webContents.isDestroyed()) return entry.webContents;
  }
  return null;
}

export function broadcastToRegisteredWindows(channel: string, ...args: unknown[]): void {
  for (const entry of entries.values()) {
    if (!entry.webContents.isDestroyed()) entry.webContents.send(channel, ...args);
  }
}

/** Test seam: drop every registration without waiting for WebContents destruction. */
export function clearWindowRoles(): void {
  entries.clear();
}
