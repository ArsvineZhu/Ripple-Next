import { DiagnosticError } from '../../shared/diagnosticError';
import { noticeAreaForCode } from '../../shared/contracts';
import type { AppNotice, NoticeArea, NoticeCode } from '../../shared/contracts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

interface NoticeInput {
  severity: AppNotice['severity'];
  code: NoticeCode;
  area?: NoticeArea;
  detail?: string;
}

interface NotificationContextValue {
  notices: AppNotice[];
  notify(input: NoticeInput): void;
  dismiss(id: string): void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<AppNotice[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const activeIds = useRef(new Map<string, string>());
  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);
  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      for (const [key, activeId] of activeIds.current) {
        if (activeId === id) activeIds.current.delete(key);
      }
      setNotices((current) => current.filter((notice) => notice.id !== id));
    },
    [clearTimer],
  );
  const addNotice = useCallback(
    (notice: AppNotice) => {
      const key = `${notice.area}:${notice.code}`;
      const previousId = activeIds.current.get(key);
      if (previousId) clearTimer(previousId);
      activeIds.current.set(key, notice.id);
      setNotices((current) => [
        ...current.filter((item) => item.area !== notice.area || item.code !== notice.code),
        notice,
      ]);
      clearTimer(notice.id);
      if (notice.severity === 'warning') {
        timers.current.set(
          notice.id,
          setTimeout(() => dismiss(notice.id), 8000),
        );
      }
    },
    [clearTimer, dismiss],
  );
  const notify = useCallback(
    (input: NoticeInput) => {
      addNotice({
        ...input,
        area: input.area ?? noticeAreaForCode(input.code),
        id: crypto.randomUUID(),
      });
    },
    [addNotice],
  );

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onAppNotice?.((notice) => {
      addNotice(notice);
    });
    void window.electronAPI?.rendererReady?.();
    return unsubscribe;
  }, [addNotice]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  const value = useMemo(() => ({ notices, notify, dismiss }), [notices, notify, dismiss]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new DiagnosticError('NotificationProvider is missing');
  return context;
}
