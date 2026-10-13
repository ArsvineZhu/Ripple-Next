import { useCallback, useEffect, useState } from 'react';
import { useAppState } from '../components/AppStateProvider';
import { useNotifications } from '../components/NotificationProvider';
import type { AIMutation } from '../../shared/aiConfiguration';

export function useAIConfiguration() {
  const { state } = useAppState();
  const { notify } = useNotifications();
  const [status, setStatus] = useState<Record<number, boolean>>({});
  const refresh = useCallback(async () => {
    try {
      setStatus(await window.electronAPI.aiConfigurationStatus());
    } catch {
      notify({ severity: 'error', code: 'stateLoadFailed', area: 'settings' });
    }
  }, [notify]);
  useEffect(() => {
    void refresh();
  }, [refresh, state.settings.secretRevision, state.settings.ai.credentials.length]);
  const mutate = async (mutation: AIMutation) => {
    try {
      return await window.electronAPI.mutateAIConfiguration(mutation);
    } catch (error) {
      notify({
        severity: 'error',
        code: 'invalidAISettings',
        area: 'settings',
        detail: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  };
  const saveCredential = async (id: number, key: string) => {
    try {
      setStatus(await window.electronAPI.saveAICredential(id, key));
      return true;
    } catch {
      notify({ severity: 'error', code: 'secretStorageUnavailable', area: 'settings' });
      return false;
    }
  };
  return { ai: state.settings.ai, status, mutate, saveCredential };
}
