import { useState, useEffect } from 'react';
import { updateClipboardHistory } from '../lib/clipboard';

export function useClipboard() {
  const [clipboard, setClipboard] = useState<string[]>([]);
  const [clipboardReadFailed, setReadFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let pending = false;
    async function getClipboard() {
      if (pending) return;
      pending = true;
      try {
        const text = await window.electronAPI.readClipboardText();
        if (active) {
          setClipboard((history) => updateClipboardHistory(history, text));
          setReadFailed(false);
        }
      } catch {
        if (active) setReadFailed(true);
      } finally {
        pending = false;
      }
    }
    void getClipboard();
    const timer = setInterval(() => {
      void getClipboard();
    }, 2000);
    window.addEventListener('focus', getClipboard);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', getClipboard);
    };
  }, []);
  return { clipboard, clipboardReadFailed, copyToClipboard: window.electronAPI.writeClipboardText };
}
