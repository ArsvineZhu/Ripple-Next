import { useCallback, useEffect, useRef, useState } from 'react';
import type { NoticeCode } from '../../shared/contracts';
import { recordRendererError, recordRendererAnswerCharacters } from '../lib/diagnostics';

export function useAssistant() {
  const [assistantError, setAssistantError] = useState<{
    kind: NoticeCode;
    detail?: string;
  } | null>(null);
  const [asked, setAsked] = useState(false);
  const [aiAnswer, setAIAnswer] = useState<string | null>(null);
  const [userText, setUserText] = useState('');
  const request = useRef<string | null>(null);
  const cancel = useCallback(() => {
    const id = request.current;
    request.current = null;
    if (id)
      void window.electronAPI
        .cancelAssistant(id)
        .catch((error) => recordRendererError('assistant', error));
  }, []);
  useEffect(() => {
    const stop = window.electronAPI.onAssistantEvent((event) => {
      if (event.requestId === request.current)
        setAIAnswer((current) => (current ?? '') + event.content);
    });
    return () => {
      stop();
      cancel();
    };
  }, [cancel]);
  const askAI = useCallback(async () => {
    if (!userText.trim()) return;
    cancel();
    const id = crypto.randomUUID();
    request.current = id;
    setAssistantError(null);
    setAIAnswer('');
    setAsked(true);
    try {
      const result = await window.electronAPI.startAssistant(id, userText);
      if (request.current !== id) return;
      request.current = null;
      if (result.status === 'complete') {
        setAIAnswer(result.text);
        recordRendererAnswerCharacters(result.text.length);
      } else if (result.status === 'error')
        setAssistantError({ kind: result.code, detail: result.detail });
    } catch (error) {
      if (request.current !== id) return;
      request.current = null;
      recordRendererError('assistant', error);
      setAssistantError({
        kind: 'aiRequestFailed',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }, [cancel, userText]);
  const resetAssistant = useCallback(() => {
    cancel();
    setAsked(false);
    setAIAnswer(null);
    setUserText('');
    setAssistantError(null);
    recordRendererAnswerCharacters(0);
  }, [cancel]);
  return { assistantError, asked, aiAnswer, userText, setUserText, askAI, resetAssistant };
}
