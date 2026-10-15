import { useEffect, useRef, useState } from 'react';
import type { Application, LaunchTarget } from '../../shared/launch';
import { useAppState } from '../components/AppStateProvider';
import { useNotifications } from '../components/NotificationProvider';

export type QuickAppMode = 'installed' | 'command' | 'url';

export function useQuickApps() {
  const { state, updateState } = useAppState();
  const { notify } = useNotifications();
  const quickApps = state.quickApps;
  const [newQuickApp, setNewQuickApp] = useState('');
  const [mode, setMode] = useState<QuickAppMode>('installed');
  const [executable, setExecutable] = useState('');
  const [argumentLines, setArgumentLines] = useState('');
  const [workingDirectory, setWorkingDirectory] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [appSuggestions, setAppSuggestions] = useState<Application[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [appSearchPending, setAppSearchPending] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const appSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedQuery = useRef('');

  useEffect(() => {
    return () => {
      requestedQuery.current = '';
      if (appSearchTimer.current) clearTimeout(appSearchTimer.current);
    };
  }, []);

  const handleQuickAppInput = (value: string) => {
    requestedQuery.current = value.trim();
    setNewQuickApp(value);
    setSelectedApplication(null);
    if (appSearchTimer.current) clearTimeout(appSearchTimer.current);
    if (mode !== 'installed' || value.trim().length < 2) {
      setAppSuggestions([]);
      setShowSuggestions(false);
      setAppSearchPending(false);
      return;
    }
    setAppSearchPending(true);
    appSearchTimer.current = setTimeout(() => {
      void window.electronAPI
        ?.discoverApps(value.trim())
        .then((results) => {
          if (requestedQuery.current !== value.trim()) return;
          setAppSearchPending(false);
          setAppSuggestions(results);
          setShowSuggestions(results.length > 0);
        })
        .catch((error: unknown) => {
          if (requestedQuery.current !== value.trim()) return;
          setAppSearchPending(false);
          setAppSuggestions([]);
          setShowSuggestions(false);
          notify({
            severity: 'error',
            code: 'unknownError',
            area: 'quick-apps',
            detail: error instanceof Error ? error.message : String(error),
          });
        });
    }, 180);
  };

  const selectQuickApp = (entry: Application) => {
    setAppSearchPending(false);
    requestedQuery.current = '';
    setSelectedApplication(entry);
    setNewQuickApp(entry.name);
    setShowSuggestions(false);
  };

  const addQuickApp = () => {
    const name = newQuickApp.trim();
    if (!name) return false;
    let target: LaunchTarget | null = selectedApplication;
    if (!target && mode === 'command' && executable.trim()) {
      target = {
        kind: 'command',
        executable: executable.trim(),
        args: argumentLines
          .split('\n')
          .map((argument) => argument.trim())
          .filter(Boolean),
        ...(workingDirectory.trim() ? { workingDirectory: workingDirectory.trim() } : {}),
      };
    } else if (!target && mode === 'url') {
      try {
        const url = new URL(appUrl.trim());
        if (url.protocol === 'http:' || url.protocol === 'https:')
          target = { kind: 'url', url: url.href };
      } catch {
        target = null;
      }
    }
    if (!target) {
      notify({ severity: 'error', code: 'invalidQuickApp', area: 'quick-apps' });
      return false;
    }
    updateState({
      quickApps: [...quickApps, { id: crypto.randomUUID(), name, target }],
    });
    setNewQuickApp('');
    setExecutable('');
    setArgumentLines('');
    setWorkingDirectory('');
    setAppUrl('');
    setSelectedApplication(null);
    setShowSuggestions(false);
    return true;
  };

  return {
    newQuickApp,
    handleQuickAppInput,
    selectQuickApp,
    appSuggestions,
    showSuggestions,
    addQuickApp,
    appSearchPending,
    selectedApplication: Boolean(selectedApplication),
    quickAppMode: mode,
    setQuickAppMode: (value: string) => {
      requestedQuery.current = '';
      setAppSearchPending(false);
      const nextMode = value as QuickAppMode;
      setMode(nextMode);
      setSelectedApplication(null);
      setShowSuggestions(false);
    },
    executable,
    setExecutable,
    argumentLines,
    setArgumentLines,
    workingDirectory,
    setWorkingDirectory,
    appUrl,
    setAppUrl,
  };
}
