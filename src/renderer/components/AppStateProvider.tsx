import type { AppState, AppStatePatch } from '../../shared/appState';
import { noticeAreaForPatch } from '../../shared/contracts';
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
import { useNotifications } from './NotificationProvider';
import { changeLanguagePreference } from '../i18n';

interface AppStateContextValue {
  state: AppState;
  updateState(patch: AppStatePatch): void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

function applyPatch(state: AppState, patch: AppStatePatch | null): AppState {
  return patch ? { ...state, ...patch, settings: { ...state.settings, ...patch.settings } } : state;
}

function mergePatches(previous: AppStatePatch | null, next: AppStatePatch): AppStatePatch {
  return { ...previous, ...next, settings: { ...previous?.settings, ...next.settings } };
}

export function AppStateProvider({
  initialState,
  children,
}: {
  initialState: AppState;
  children?: ReactNode;
}) {
  const [state, setState] = useState(initialState);
  const { notify } = useNotifications();
  useEffect(() => {
    document.documentElement.dataset.uiFont = state.settings.uiFont;
  }, [state.settings.uiFont]);
  useEffect(() => {
    void changeLanguagePreference(state.settings.language);
  }, [state.settings.language]);
  const writes = useRef({
    authoritative: initialState,
    inFlight: null as AppStatePatch | null,
    queued: null as AppStatePatch | null,
    running: false,
  });
  const updateState = useCallback(
    (patch: AppStatePatch) => {
      setState((current) => applyPatch(current, patch));
      const pending = writes.current;
      pending.queued = mergePatches(pending.queued, patch);
      if (pending.running) return;
      pending.running = true;
      void (async () => {
        while (pending.queued) {
          const next = pending.queued;
          pending.queued = null;
          pending.inFlight = next;
          try {
            const result = await window.electronAPI?.updateAppState?.(next);
            pending.authoritative = result ?? applyPatch(pending.authoritative, next);
          } catch (error) {
            notify({
              severity: 'error',
              code: 'stateSaveFailed',
              area: noticeAreaForPatch(next),
              detail: error instanceof Error ? error.message : String(error),
            });
          }
          pending.inFlight = null;
          setState(applyPatch(pending.authoritative, pending.queued));
        }
        pending.running = false;
      })();
    },
    [notify],
  );
  useEffect(() => {
    return window.electronAPI?.onAppStateChanged?.((next) => {
      const pending = writes.current;
      pending.authoritative = next;
      setState(applyPatch(applyPatch(next, pending.inFlight), pending.queued));
    });
  }, []);
  const value = useMemo(() => ({ state, updateState }), [state, updateState]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('AppStateProvider is missing');
  return context;
}
