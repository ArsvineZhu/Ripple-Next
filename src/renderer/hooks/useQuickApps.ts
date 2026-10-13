import { useEffect, useRef, useState } from 'react';
import type { AppEntry, QuickAppTarget } from '../../shared/contracts';
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
  const [appSuggestions, setAppSuggestions] = useState<AppEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const selectedAppRef = useRef<AppEntry | null>(null);
  const appSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (window.electronAPI?.platform === 'win32') {
      void window.electronAPI.buildAppCache().catch((error: unknown) => {
        notify({
          severity: 'error',
          code: 'unknownError',
          area: 'quick-apps',
          detail: error instanceof Error ? error.message : String(error),
        });
      });
    }
    return () => {
      if (appSearchTimer.current) clearTimeout(appSearchTimer.current);
    };
  }, [notify]);

  const handleQaChange = (index: number, value: string) => {
    const updatedApps = [...quickApps];
    const existing = updatedApps[index];
    if (!existing) return;
    updatedApps[index] = { ...existing, name: value };
    updateState({ quickApps: updatedApps });
  };

  const handleQuickAppInput = (value: string) => {
    setNewQuickApp(value);
    selectedAppRef.current = null;
    if (appSearchTimer.current) clearTimeout(appSearchTimer.current);
    if (mode !== 'installed' || value.trim().length < 2) {
      setAppSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    appSearchTimer.current = setTimeout(() => {
      void window.electronAPI
        ?.discoverApps(value.trim())
        .then((results) => {
          setAppSuggestions(results);
          setShowSuggestions(results.length > 0);
        })
        .catch((error: unknown) => {
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

  const selectQuickApp = (entry: AppEntry) => {
    selectedAppRef.current = entry;
    setNewQuickApp(entry.name);
    setShowSuggestions(false);
  };

  const addQuickApp = () => {
    const name = newQuickApp.trim();
    if (!name) return false;
    let target: QuickAppTarget | null = selectedAppRef.current?.target || null;
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
    selectedAppRef.current = null;
    setShowSuggestions(false);
    return true;
  };

  const removeQuickApp = (index: number) =>
    updateState({ quickApps: quickApps.filter((_, currentIndex) => currentIndex !== index) });

  return {
    quickApps,
    newQuickApp,
    handleQuickAppInput,
    selectQuickApp,
    appSuggestions,
    showSuggestions,
    setShowSuggestions,
    handleQaChange,
    addQuickApp,
    removeQuickApp,
    quickAppMode: mode,
    setQuickAppMode: (value: string) => {
      const nextMode = value as QuickAppMode;
      setMode(nextMode);
      selectedAppRef.current = null;
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
