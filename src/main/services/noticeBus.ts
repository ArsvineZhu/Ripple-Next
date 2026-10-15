import { randomUUID } from 'node:crypto';
import { noticeAreaForCode } from '../../shared/contracts';
import type { AppNotice, NoticeArea, NoticeCode } from '../../shared/contracts';
import { showMainWindow } from '../window';
import { getWebContentsForRole } from '../windowRoles';
import type { WindowRole } from '../windowRoles';

function noticeWindowRole(area: NoticeArea): WindowRole {
  return area === 'settings' ? 'settings' : 'island';
}

export function createNoticeBus() {
  const ready: Record<WindowRole, boolean> = { island: false, settings: false };
  const pending: Record<WindowRole, AppNotice[]> = { island: [], settings: [] };

  const deliver = (notice: AppNotice) => {
    const role = noticeWindowRole(notice.area);
    const contents = getWebContentsForRole(role);
    if (!ready[role] || !contents || contents.isDestroyed()) {
      pending[role].push(notice);
      if (pending[role].length > 8) pending[role].shift();
      return;
    }
    contents.send('app-notice', notice);
  };

  return {
    report(
      code: NoticeCode,
      detail?: string,
      severity: AppNotice['severity'] = 'error',
      area: NoticeArea = noticeAreaForCode(code),
    ) {
      deliver({
        id: randomUUID(),
        severity,
        code,
        area,
        ...(detail ? { detail: detail.slice(0, 320) } : {}),
      });
    },
    rendererReady(role: WindowRole) {
      ready[role] = true;
      // Only the island's readiness shows the island; settings readiness must not.
      if (role === 'island') showMainWindow();
      const queued = pending[role].splice(0);
      for (const notice of queued) deliver(notice);
    },
  };
}
